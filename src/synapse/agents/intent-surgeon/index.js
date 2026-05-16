const axios = require('axios');
const logger = require('../../../common/logger');
const db = require('../../../common/db'); // Import common db
const { GoogleAdsApiError, DatabaseError } = require('../../../common/errors');

class IntentSurgeon {
  constructor(googleAdsApiManager, model = 'gemini-3-flash-preview') {
    if (!googleAdsApiManager) {
      logger.error('IntentSurgeon: GoogleAdsApiManager not provided.');
      throw new Error('GoogleAdsApiManager is required.');
    }
    this.googleAdsApiManager = googleAdsApiManager;
    this.model = model;
    this.apiKey = process.env.GEMINI_API_KEY;
    this.geminiApiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    if (!this.apiKey) {
      logger.warn('IntentSurgeon: GEMINI_API_KEY not set in environment variables. AI analysis will not be available.');
    }
  }

  async identifyNegativeKeywordsWithAI(searchTerm, clicks, cost, isEscalated = false) {
    if (!this.apiKey) {
      logger.warn('IntentSurgeon: Skipping AI analysis, GEMINI_API_KEY is not set.');
      return false;
    }

    const currentModel = isEscalated ? 'gemini-3.1-pro-preview' : this.model;
    const currentEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${this.apiKey}`;
    const modelTag = isEscalated ? 'Pro (escalated)' : 'Flash';
    logger.info(`IntentSurgeon: Analyzing "${searchTerm}" with ${modelTag} model.`);

    const prompt = `Given the search term "${searchTerm}", with ${clicks} clicks and a cost of $${cost}, should this be added as a negative keyword? Consider if it's irrelevant or too broad, leading to wasted spend. Respond with ONLY 'YES' or 'NO'.`;

    try {
      const response = await axios.post(currentEndpoint, {
        contents: [
          {
            parts: [
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: isEscalated ? 0.3 : 0.1, // Slightly higher temp for Pro for more nuanced reasoning
          topP: 0.95,
          topK: 40,
        },
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const geminiResponse = response.data.candidates[0].content.parts[0].text.trim().toUpperCase();
      return geminiResponse === 'YES';
    } catch (error) {
      logger.error(`IntentSurgeon: AI analysis failed for "${searchTerm}" with ${modelTag} model: ${error.message}`);
      if (!isEscalated) {
        logger.info(`IntentSurgeon: Escalating analysis for "${searchTerm}" to Pro model.`);
        return this.identifyNegativeKeywordsWithAI(searchTerm, clicks, cost, true);
      }
      return false; // Default to not adding as negative keyword on escalated AI failure
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
      const shouldBeNegative = await this.identifyNegativeKeywordsWithAI(term.searchTerm, term.clicks, term.cost);

      if (shouldBeNegative) {
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
