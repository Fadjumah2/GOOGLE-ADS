const { initDb, closeDb, getDb } = require('./db');
const logger = require('../../common/logger');
const { GoogleAdsApiError, DatabaseError } = require('../../common/errors');

class IntentSurgeon {
  constructor(googleAdsApiManager) {
    this.dbInitialized = false;
    if (!googleAdsApiManager) {
      logger.error('IntentSurgeon: GoogleAdsApiManager not provided.');
      throw new Error('GoogleAdsApiManager is required.');
    }
    this.googleAdsApiManager = googleAdsApiManager;
  }

  async initialize() {
    if (!this.dbInitialized) {
      try {
        await initDb();
        this.dbInitialized = true;
        logger.info('IntentSurgeon: Database initialized.');
      } catch (error) {
        throw new DatabaseError('Failed to initialize IntentSurgeon database', error);
      }
    }
  }

  async fetchSearchTermReport(campaignId, operatingCustomerId) {
    logger.info(`IntentSurgeon: Fetching search term report for campaign ${campaignId} (Customer: ${operatingCustomerId})`);

    const query = `
      SELECT
        search_term_view.search_term,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        campaign.id
      FROM
        search_term_view
      WHERE
        campaign.id = ${campaignId}
        AND segments.date DURING LAST_30_DAYS
        AND search_term_view.status = 'ADDED'
      ORDER BY
        metrics.clicks DESC
      LIMIT 1000`; // Limit to avoid excessive data

    try {
      const reports = await this.googleAdsApiManager.query(operatingCustomerId, query);
      // Google Ads API returns data in a nested structure. Flatten it for easier processing.
      return reports.map(row => ({
        searchTerm: row.search_term_view.search_term,
        clicks: row.metrics.clicks,
        conversions: row.metrics.conversions,
        cost: row.metrics.cost_micros / 1000000, // Convert micros to actual currency
        campaignId: row.campaign.id,
      }));
    } catch (error) {
      throw new GoogleAdsApiError(`Failed to fetch search term report for campaign ${campaignId}`, error);
    }
  }

  async analyzeSearchTerms(campaignId, operatingCustomerId) {
    await this.initialize(); // Ensure DB is initialized
    logger.info(`IntentSurgeon: Analyzing search terms for campaign ${campaignId}`);

    let searchTerms;
    try {
      searchTerms = await this.fetchSearchTermReport(campaignId, operatingCustomerId);
    } catch (error) {
      logger.error(`IntentSurgeon: Could not fetch search term report for campaign ${campaignId}: ${error.message}`);
      return []; // Return empty if report cannot be fetched
    }

    const negativeKeywords = [];
    const db = getDb();

    // Simple analysis: identify search terms with 0 conversions and a significant number of clicks or cost
    // This is a basic rule; real-world logic would be more sophisticated.
    for (const term of searchTerms) {
      if (term.conversions === 0 && (term.clicks > 5 || term.cost > 2.0)) { // Example threshold
        logger.warn(`IntentSurgeon: Identified potential negative keyword: "${term.searchTerm}" (Clicks: ${term.clicks}, Cost: ${term.cost})`);
        negativeKeywords.push({
          keyword: term.searchTerm,
          campaign_id: campaignId,
          match_type: 'EXACT', // Prioritizing Exact Match as per requirement
        });

        // Store in SQLite
        try {
          await new Promise((resolve, reject) => {
            db.run(
              `INSERT OR IGNORE INTO learned_negatives (keyword, campaign_id, match_type) VALUES (?, ?, ?)`,
              [term.searchTerm, campaignId, 'EXACT'],
              function (err) {
                if (err) {
                  reject(new DatabaseError(`Error storing negative keyword "${term.searchTerm}": ${err.message}`, err));
                } else if (this.changes > 0) {
                  logger.info(`IntentSurgeon: Stored new learned negative keyword: "${term.searchTerm}"`);
                }
                resolve();
              }
            );
          });
        } catch (error) {
          logger.error(`IntentSurgeon: ${error.message}`);
        }
      }
    }
    return negativeKeywords;
  }

  async injectNegativeKeywords(negativeKeywords, operatingCustomerId) {
    if (negativeKeywords.length === 0) {
      logger.info('IntentSurgeon: No negative keywords to inject.');
      return;
    }
    logger.info(`IntentSurgeon: Injecting ${negativeKeywords.length} negative keywords for Customer: ${operatingCustomerId}`);

    for (const nk of negativeKeywords) {
      try {
        logger.info(`IntentSurgeon: Injecting "${nk.keyword}" (Match Type: ${nk.match_type}) into campaign ${nk.campaign_id}`);
        const result = await this.googleAdsApiManager.addCampaignNegativeKeyword(operatingCustomerId, nk.campaign_id, nk.keyword);
        logger.info(`IntentSurgeon: Successfully injected negative keyword "${nk.keyword}". Result:`, result);
      } catch (error) {
        logger.error(new GoogleAdsApiError(`Failed to inject negative keyword "${nk.keyword}" for campaign ${nk.campaign_id}: ${error.message}`, error));
      }
    }
    logger.info('IntentSurgeon: Negative keyword injection process complete.');
  }

  async shutdown() {
    try {
      await closeDb();
      this.dbInitialized = false;
      logger.info('IntentSurgeon: Shut down.');
    } catch (error) {
      logger.error(new DatabaseError('Failed to gracefully close IntentSurgeon database', error));
    }
  }
}

module.exports = IntentSurgeon;
