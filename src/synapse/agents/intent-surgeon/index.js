const logger = require('../../common/logger');
const db = require('../../common/db'); // Import common db
const { GoogleAdsApiError, DatabaseError } = require('../../common/errors');

class IntentSurgeon {
  constructor(googleAdsApiManager) {
    if (!googleAdsApiManager) {
      logger.error('IntentSurgeon: GoogleAdsApiManager not provided.');
      throw new Error('GoogleAdsApiManager is required.');
    }
    this.googleAdsApiManager = googleAdsApiManager;
  }

  // Remove initialize method as it's no longer needed for SQLite
  // async initialize() {
  //   if (!this.dbInitialized) {
  //     try {
  //       await initDb();
  //       this.dbInitialized = true;
  //       logger.info('IntentSurgeon: Database initialized.');
  //     } catch (error) {
  //       throw new DatabaseError('Failed to initialize IntentSurgeon database', error);
  //     }
  //   }
  // }

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

  async analyzeSearchTerms(campaignId, operatingCustomerId, agentRunId) {
    logger.info(`IntentSurgeon: Analyzing search terms for campaign ${campaignId}`);

    let searchTerms;
    try {
      searchTerms = await this.fetchSearchTermReport(campaignId, operatingCustomerId);
    } catch (error) {
      logger.error(`IntentSurgeon: Could not fetch search term report for campaign ${campaignId}: ${error.message}`);
      return []; // Return empty if report cannot be fetched
    }

    const negativeKeywordsToInject = [];

    // Simple analysis: identify search terms with 0 conversions and a significant number of clicks or cost
    // This is a basic rule; real-world logic would be more sophisticated.
    for (const term of searchTerms) {
      if (term.conversions === 0 && (term.clicks > 5 || term.cost > 2.0)) { // Example threshold
        logger.warn(`IntentSurgeon: Identified potential negative keyword: "${term.searchTerm}" (Clicks: ${term.clicks}, Cost: $${term.cost})`);

        let logId;
        try {
          const insertLogQuery = `
            INSERT INTO intent_surgeon_logs (agent_run_id, campaign_id, search_term, identified_reason, status, injected_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING id;
          `;
          const { rows } = await db.query(insertLogQuery, [
            agentRunId,
            campaignId,
            term.searchTerm,
            `Clicks: ${term.clicks}, Cost: $${term.cost}`,
            'identified'
          ]);
          logId = rows[0].id;
          logger.info(`IntentSurgeon: Logged identified negative keyword "${term.searchTerm}" with log ID: ${logId}`);
        } catch (error) {
          logger.error(`IntentSurgeon: Failed to log identified negative keyword "${term.searchTerm}": ${error.message}`);
          // Continue processing even if logging fails
        }

        negativeKeywordsToInject.push({
          keyword: term.searchTerm,
          campaign_id: campaignId,
          match_type: 'EXACT', // Prioritizing Exact Match as per requirement
          log_id: logId // Store log_id to update status later
        });
      }
    }
    return negativeKeywordsToInject;
  }

  async injectNegativeKeywords(negativeKeywordsToInject, operatingCustomerId, agentRunId) {
    if (negativeKeywordsToInject.length === 0) {
      logger.info('IntentSurgeon: No negative keywords to inject.');
      return;
    }
    logger.info(`IntentSurgeon: Injecting ${negativeKeywordsToInject.length} negative keywords for Customer: ${operatingCustomerId}`);

    for (const nk of negativeKeywordsToInject) {
      try {
        logger.info(`IntentSurgeon: Injecting "${nk.keyword}" (Match Type: ${nk.match_type}) into campaign ${nk.campaign_id}`);
        const result = await this.googleAdsApiManager.addCampaignNegativeKeyword(operatingCustomerId, nk.campaign_id, nk.keyword);
        logger.info(`IntentSurgeon: Successfully injected negative keyword "${nk.keyword}". Result:`, result);

        // Update log status to injected
        if (nk.log_id) {
          await db.query(
            `UPDATE intent_surgeon_logs SET status = $1, negative_keyword_text = $2 WHERE id = $3`,
            ['injected', nk.keyword, nk.log_id]
          );
          logger.info(`IntentSurgeon: Updated log status for "${nk.keyword}" (Log ID: ${nk.log_id}) to 'injected'.`);
        }
      } catch (error) {
        logger.error(new GoogleAdsApiError(`Failed to inject negative keyword "${nk.keyword}" for campaign ${nk.campaign_id}: ${error.message}`, error));
        // Update log status to failed if injection fails
        if (nk.log_id) {
          await db.query(
            `UPDATE intent_surgeon_logs SET status = $1, identified_reason = $2 WHERE id = $3`,
            ['failed', `Injection failed: ${error.message}`, nk.log_id]
          );
          logger.error(`IntentSurgeon: Updated log status for "${nk.keyword}" (Log ID: ${nk.log_id}) to 'failed'.`);
        }
      }
    }
    logger.info('IntentSurgeon: Negative keyword injection process complete.');
  }

  async shutdown() {
    logger.info('IntentSurgeon: Shut down.');
  }
}

module.exports = IntentSurgeon;
