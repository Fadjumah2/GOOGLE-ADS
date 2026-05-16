const axios = require('axios');
const logger = require('../../../common/logger');
const db = require('../../../common/db');
const { GoogleAdsApiError } = require('../../../common/errors');

class WeeklyAuditor {
  constructor(googleAdsApiManager, model = 'gemini-3.1-pro-preview') {
    logger.info('WeeklyAuditor: Initializing...');
    if (!googleAdsApiManager) {
      logger.error('WeeklyAuditor: GoogleAdsApiManager not provided.');
      throw new Error('GoogleAdsApiManager is required.');
    }
    this.googleAdsApiManager = googleAdsApiManager;
    this.model = model;
    this.apiKey = process.env.GEMINI_API_KEY;
    this.geminiApiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    if (!this.apiKey) {
      logger.warn('WeeklyAuditor: GEMINI_API_KEY not set in environment variables. AI analysis will not be available.');
    }
  }

  async fetchLongTermPerformanceData(campaignId, operatingCustomerId) {
    logger.info(`WeeklyAuditor: Fetching long-term performance data for campaign ${campaignId} (Customer: ${operatingCustomerId})`);

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        segments.date
      FROM
        campaign
      WHERE
        campaign.id = ${campaignId}
        AND segments.date DURING LAST_90_DAYS
      ORDER BY
        segments.date ASC`;

    try {
      const response = await this.googleAdsApiManager.query(operatingCustomerId, query);
      return response.map(row => ({
        date: row.segments.date,
        clicks: row.metrics.clicks,
        conversions: row.metrics.conversions,
        cost: row.metrics.cost_micros / 1000000,
      }));
    } catch (error) {
      throw new GoogleAdsApiError(`Failed to fetch long-term performance data for campaign ${campaignId}`, error);
    }
  }

  async analyzeCampaignDeeply(campaignId, operatingCustomerId, agentRunId) {
    logger.info(`WeeklyAuditor: Performing deep analysis for campaign ${campaignId}`);

    if (!this.apiKey) {
      logger.warn('WeeklyAuditor: Skipping deep AI analysis, GEMINI_API_KEY is not set.');
      return { status: 'skipped', message: 'API key not set.' };
    }

    let performanceData;
    try {
      performanceData = await this.fetchLongTermPerformanceData(campaignId, operatingCustomerId);
    } catch (error) {
      logger.error(`WeeklyAuditor: Could not fetch long-term performance data for campaign ${campaignId}: ${error.message}`);
      return { status: 'error', message: `Failed to fetch performance data: ${error.message}` };
    }

    const prompt = `Perform a deep analysis of the following Google Ads campaign performance data. Focus on conversion psychology, long-horizon data patterns, and suggest ad-copy improvements.

Campaign ID: ${campaignId}
Performance Data (last 90 days, daily):
${JSON.stringify(performanceData, null, 2)}

Provide a summary of key insights, identify any trends or anomalies, and suggest concrete ad copy improvements. Be thorough and detailed.`;

    try {
      const response = await axios.post(this.geminiApiEndpoint, {
        contents: [
          {
            parts: [
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
        },
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const geminiResponse = response.data.candidates[0].content.parts[0].text;
      logger.info(`WeeklyAuditor: Deep analysis complete for campaign ${campaignId}.`);

      await db.query(
        `INSERT INTO weekly_auditor_logs (agent_run_id, campaign_id, analysis_result, logged_at) VALUES ($1, $2, $3, NOW())`,
        [agentRunId, campaignId, { geminiResponse, performanceData }]
      );

      return { status: 'completed', analysis: geminiResponse };
    } catch (error) {
      logger.error(`WeeklyAuditor: Deep AI analysis failed for campaign ${campaignId}: ${error.message}`);
      await db.query(
        `INSERT INTO weekly_auditor_logs (agent_run_id, campaign_id, analysis_result, logged_at) VALUES ($1, $2, $3, NOW())`,
        [agentRunId, campaignId, { error: error.message, stack: error.stack }]
      );
      return { status: 'error', message: `AI analysis failed: ${error.message}` };
    }
  }

  async shutdown() {
    logger.info('WeeklyAuditor: Shut down.');
  }
}

module.exports = WeeklyAuditor;
