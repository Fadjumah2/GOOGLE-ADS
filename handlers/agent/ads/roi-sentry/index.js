import logger from '../../../utils/logger.js';
import db from '../../../utils/db.js';
import { GoogleAdsApiError } from '../../../utils/error.js';
import { generateContent, MODELS } from '../../../utils/geminiClient.js';

class RoiSentry {
  constructor(googleAdsApiManager, model = MODELS.LITE) {
    logger.info('ROI Sentry: Initializing...');
    if (!googleAdsApiManager) {
      logger.error('RoiSentry: GoogleAdsApiManager not provided.');
      throw new Error('GoogleAdsApiManager is required.');
    }
    this.googleAdsApiManager = googleAdsApiManager;
    this.model = model;
    this.apiKey = process.env.GEMINI_API_KEY;

    if (!this.apiKey) {
      logger.warn('RoiSentry: GEMINI_API_KEY not set in environment variables. AI budget analysis will not be available.');
    }
  }

  async analyzeBudgetWithAI(campaignId, budget, performance, spendPercentage, isEscalated = false) {
    if (!this.apiKey) {
      logger.warn('RoiSentry: Skipping AI budget analysis, GEMINI_API_KEY is not set.');
      return { status: 'OK', message: 'Skipped AI analysis due to missing API key.' };
    }

    const currentModel = isEscalated ? MODELS.CORE : this.model;
    const modelTag = isEscalated ? 'Core (escalated)' : 'Lite';
    logger.info(`RoiSentry: Analyzing budget for campaign ${campaignId} with ${modelTag} model.`);

    // Compact prompt: JSON output enforcement, removing loose prose
    const prompt = `Analyze budget for Campaign ${campaignId}. 
Spend: $${performance.cost.toFixed(2)}, Daily Budget: $${budget.amount.toFixed(2)}, Spent: ${spendPercentage.toFixed(2)}%.
Output: JSON with "status" (OK, ALERT, CRITICAL), "message", and "actionRecommended" (e.g., 'REVIEW_BUDGET_OR_PAUSE', 'INCREASE_BUDGET', 'CONTINUE_MONITORING').`;

    try {
      const geminiResponseText = await generateContent(prompt, {
        model: currentModel,
        temperature: isEscalated ? 0.4 : 0.2,
        responseMimeType: 'application/json',
      });

      const geminiResponse = JSON.parse(geminiResponseText);
      return geminiResponse;
    } catch (error) {
      logger.error(`RoiSentry: AI budget analysis failed for campaign ${campaignId} with ${modelTag} model: ${error.message}`);
      if (!isEscalated) {
        logger.info(`RoiSentry: Escalating budget analysis for campaign ${campaignId} to Core model.`);
        return this.analyzeBudgetWithAI(campaignId, budget, performance, spendPercentage, true);
      }
      // Fallback to basic logic on escalated AI failure
      if (spendPercentage >= 80) {
        return {
          campaignId: campaignId,
          status: 'ALERT',
          message: `Budget nearing limit: ${spendPercentage.toFixed(2)}% spent (AI failure fallback).`,
          actionRecommended: 'REVIEW_BUDGET_OR_PAUSE',
        };
      } else {
        return {
          campaignId: campaignId,
          status: 'OK',
          message: 'Budget within limits (AI failure fallback).',
        };
      }
    }
  }

  async fetchCampaignBudgetAndPerformance(campaignId, operatingCustomerId) {
    logger.info(`ROI Sentry: Fetching budget and performance for campaign ${campaignId} (Customer: ${operatingCustomerId})`);

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign_budget.amount_micros,
        metrics.cost_micros,
        metrics.clicks,
        metrics.conversions
      FROM
        campaign
      WHERE
        campaign.id = ${campaignId}
      LIMIT 1`;

    try {
      const response = await this.googleAdsApiManager.query(operatingCustomerId, query);
      if (!response || response.length === 0) {
        throw new Error(`Campaign ${campaignId} not found or no data available.`);
      }
      const data = response[0];

      return {
        campaignId: data.campaign.id,
        budget: {
          amount: data.campaign_budget.amount_micros / 1000000, // Convert micros to actual currency
          period: 'DAILY', // Assuming daily budget for simplicity, actual data might vary
        },
        performance: {
          cost: data.metrics.cost_micros / 1000000, // Convert micros to actual currency
          clicks: data.metrics.clicks,
          conversions: data.metrics.conversions,
        },
        status: data.campaign.status,
      };
    } catch (error) {
      throw new GoogleAdsApiError(`Failed to fetch campaign budget and performance for campaign ${campaignId}`, error);
    }
  }

  async monitorBudget(campaignId, operatingCustomerId, agentRunId) { // Add agentRunId here
    logger.info(`ROI Sentry: Monitoring budget for campaign ${campaignId}`);
    let budget, performance;
    let result = {};
    try {
      ({ budget, performance } = await this.fetchCampaignBudgetAndPerformance(campaignId, operatingCustomerId));
    } catch (error) {
      logger.error(`ROI Sentry: Could not fetch budget/performance for campaign ${campaignId}: ${error.message}`);
      result = { campaignId: campaignId, status: 'ERROR', message: error.message };
      // Log the error
      await db.query(
        'INSERT INTO roi_sentry_logs (agent_run_id, campaign_id, budget_status, action_taken, logged_at) VALUES ($1, $2, $3, $4, NOW())',
        [agentRunId, campaignId, 'ERROR', `Failed to fetch budget/performance: ${error.message}`]
      );
      return result;
    }


    const spendPercentage = (performance.cost / budget.amount) * 100;
    logger.info(`ROI Sentry: Campaign ${campaignId} - Current Spend: $${performance.cost}, Budget: $${budget.amount}, Spend Percentage: ${spendPercentage.toFixed(2)}%`);

    // Use AI for budget monitoring
    result = await this.analyzeBudgetWithAI(campaignId, budget, performance, spendPercentage);


    // Log to roi_sentry_logs table
    try {
      await db.query(
        'INSERT INTO roi_sentry_logs (agent_run_id, campaign_id, budget_status, performance_metrics, action_taken, logged_at) VALUES ($1, $2, $3, $4, $5, NOW())',
        [agentRunId, campaignId, result.status, { budget, performance, spendPercentage }, result.actionRecommended || 'NONE']
      );
      logger.info(`ROI Sentry: Logged budget monitoring for campaign ${campaignId} (Run: ${agentRunId}).`);
    } catch (logError) {
      logger.error(`ROI Sentry: Failed to log budget monitoring for campaign ${campaignId}: ${logError.message}`);
    }

    return result;
  }

  async pauseCampaign(campaignId, operatingCustomerId) {
    logger.info(`ROI Sentry: Pausing campaign ${campaignId} for Customer: ${operatingCustomerId}`);

    const operations = [
      {
        update: {
          resource_name: `customers/${operatingCustomerId}/campaigns/${campaignId}`,
          status: 'PAUSED',
        },
      },
    ];

    try {
      const result = await this.googleAdsApiManager.mutate(operatingCustomerId, operations);
      logger.info(`ROI Sentry: Successfully paused campaign ${campaignId}. Result:`, result);
      return { success: true, message: `Campaign ${campaignId} paused successfully.`, result: result };
    } catch (error) {
      throw new GoogleAdsApiError(`Failed to pause campaign ${campaignId}: ${error.message}`, error);
    }
  }

  async implementSafetyPausing(campaignId, operatingCustomerId) {
    logger.info(`ROI Sentry: Checking safety pause for campaign ${campaignId}`);
    const budgetStatus = await this.monitorBudget(campaignId, operatingCustomerId);

    if (budgetStatus.status === 'ALERT' && budgetStatus.actionRecommended === 'REVIEW_BUDGET_OR_PAUSE') {
      logger.warn(`ROI Sentry: Triggering safety pause for campaign ${campaignId} due to budget alert.`);
      let pauseResult;
      try {
        pauseResult = await this.pauseCampaign(campaignId, operatingCustomerId);
      } catch (error) {
        logger.error(`ROI Sentry: Failed to implement safety pause for campaign ${campaignId}: ${error.message}`);
        return {
          campaignId: campaignId,
          action: 'FAILED_TO_PAUSE',
          details: error.message,
        };
      }
      return {
        campaignId: campaignId,
        action: 'PAUSED',
        details: pauseResult,
      };
    } else {
      logger.info(`ROI Sentry: No safety pause needed for campaign ${campaignId}.`);
      return {
        campaignId: campaignId,
        action: 'NONE',
        details: 'Budget within limits, no pause triggered.',
      };
    }
  }

  async shutdown() {
    logger.info('ROI Sentry: Shut down.');
  }
}

export default RoiSentry;
