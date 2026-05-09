const logger = require('../../common/logger');
const { GoogleAdsApiError } = require('../../common/errors');

class RoiSentry {
  constructor(googleAdsApiManager) {
    logger.info('ROI Sentry: Initializing...');
    if (!googleAdsApiManager) {
      logger.error('RoiSentry: GoogleAdsApiManager not provided.');
      throw new Error('GoogleAdsApiManager is required.');
    }
    this.googleAdsApiManager = googleAdsApiManager;
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

  async monitorBudget(campaignId, operatingCustomerId) {
    logger.info(`ROI Sentry: Monitoring budget for campaign ${campaignId}`);
    let budget, performance;
    try {
      ({ budget, performance } = await this.fetchCampaignBudgetAndPerformance(campaignId, operatingCustomerId));
    } catch (error) {
      logger.error(`ROI Sentry: Could not fetch budget/performance for campaign ${campaignId}: ${error.message}`);
      return { campaignId: campaignId, status: 'ERROR', message: error.message };
    }


    const spendPercentage = (performance.cost / budget.amount) * 100;
    logger.info(`ROI Sentry: Campaign ${campaignId} - Current Spend: $${performance.cost}, Budget: $${budget.amount}, Spend Percentage: ${spendPercentage.toFixed(2)}%`);

    // Simple budget monitoring logic: if spend exceeds 80% of budget, flag for attention
    if (spendPercentage >= 80) {
      logger.warn(`ROI Sentry: WARNING! Campaign ${campaignId} has exceeded 80% of its budget.`);
      return {
        campaignId: campaignId,
        status: 'ALERT',
        message: `Budget nearing limit: ${spendPercentage.toFixed(2)}% spent.`,
        actionRecommended: 'REVIEW_BUDGET_OR_PAUSE',
      };
    } else {
      logger.info(`ROI Sentry: Campaign ${campaignId} budget is within limits.`);
      return {
        campaignId: campaignId,
        status: 'OK',
        message: 'Budget within limits.',
      };
    }
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

module.exports = RoiSentry;
