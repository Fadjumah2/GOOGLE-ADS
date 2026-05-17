import logger from '../../../utils/logger.js';
import db from '../../../utils/db.js';
import { GoogleAdsApiError } from '../../../utils/error.js';
import { generateContent, MODELS } from '../../../utils/geminiClient.js';

class WeeklyAuditor {
  constructor(googleAdsApiManager, model = MODELS.CORE) {
    logger.info('WeeklyAuditor: Initializing...');
    if (!googleAdsApiManager) {
      logger.error('WeeklyAuditor: GoogleAdsApiManager not provided.');
      throw new Error('GoogleAdsApiManager is required.');
    }
    this.googleAdsApiManager = googleAdsApiManager;
    this.model = model;
    this.apiKey = process.env.GEMINI_API_KEY;

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

    // Compact prompt: Removing redundant descriptions
    const prompt = `Task: Deep campaign analysis.
Campaign: ${campaignId}
Data (90d): ${JSON.stringify(performanceData)}
Goal: Identify trends, anomalies, and suggest copy improvements. Output structured text.`;

    try {
      const geminiResponse = await generateContent(prompt, {
        model: this.model,
        temperature: 0.7,
      });

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

export default WeeklyAuditor;
