
const logger = require('../common/logger');
const GoogleAdsApiManager = require('../services/google-ads-api-manager');
const IntentSurgeon = require('./agents/intent-surgeon');
const PersuasionArchitect = require('./agents/persuasion-architect');
const RoiSentry = require('./agents/roi-sentry');

// Default IDs to be used for the operation.
// In a real-world scenario, these would be dynamically determined.
const OPERATING_CUSTOMER_ID = '6022317886';
const CAMPAIGN_ID = '20689821345'; // Example campaign ID

class AgentOrchestrator {
  constructor() {
    logger.info('AgentOrchestrator: Initializing...');
    this.googleAdsApiManager = new GoogleAdsApiManager();
    this.intentSurgeon = new IntentSurgeon(this.googleAdsApiManager);
    this.persuasionArchitect = new PersuasionArchitect(this.googleAdsApiManager);
    this.roiSentry = new RoiSentry(this.googleAdsApiManager);
    logger.info('AgentOrchestrator: All agents initialized.');
  }

  async _getAdGroupIds(campaignId, customerId) {
    logger.info(`AgentOrchestrator: Fetching ad group IDs for campaign ${campaignId}`);
    const query = `
      SELECT ad_group.id
      FROM ad_group
      WHERE campaign.id = ${campaignId}
      AND ad_group.status = 'ENABLED'
    `;
    try {
      const response = await this.googleAdsApiManager.query(customerId, query);
      if (!response || response.length === 0) {
        logger.warn(`AgentOrchestrator: No enabled ad groups found for campaign ${campaignId}.`);
        return [];
      }
      return response.map(row => row.ad_group.id);
    } catch (error) {
      logger.error(`AgentOrchestrator: Failed to fetch ad group IDs for campaign ${campaignId}: ${error.message}`);
      return [];
    }
  }

  async run() {
    logger.info('AgentOrchestrator: Starting autonomous operation cycle...');

    try {
      // 1. ROI Sentry: Monitor budget and performance
      logger.info(`--- Running ROI Sentry for Campaign ${CAMPAIGN_ID} ---`);
      const budgetStatus = await this.roiSentry.monitorBudget(CAMPAIGN_ID, OPERATING_CUSTOMER_ID);
      if (budgetStatus.status === 'ALERT') {
        logger.warn('AgentOrchestrator: ROI Sentry detected a budget alert. Pausing operations on this campaign for now.');
        // In a more complex scenario, we might pause the campaign here.
        // await this.roiSentry.implementSafetyPausing(CAMPAIGN_ID, OPERATING_CUSTOMER_ID);
        // return; // Stop processing for this campaign
      } else {
        logger.info('AgentOrchestrator: Budget status is OK.');
      }

      // 2. Intent Surgeon: Analyze and clean up search intent
      logger.info(`--- Running Intent Surgeon for Campaign ${CAMPAIGN_ID} ---`);
      const negativeKeywords = await this.intentSurgeon.analyzeSearchTerms(CAMPAIGN_ID, OPERATING_CUSTOMER_ID);
      if (negativeKeywords && negativeKeywords.length > 0) {
        logger.info(`AgentOrchestrator: Intent Surgeon identified ${negativeKeywords.length} negative keywords.`);
        await this.intentSurgeon.injectNegativeKeywords(negativeKeywords, OPERATING_CUSTOMER_ID);
      } else {
        logger.info('AgentOrchestrator: No new negative keywords identified.');
      }

      // 3. Persuasion Architect: Fetch Ad Groups and rewrite ad copy
      logger.info(`--- Running Persuasion Architect for Campaign ${CAMPAIGN_ID} ---`);
      const adGroupIds = await this._getAdGroupIds(CAMPAIGN_ID, OPERATING_CUSTOMER_ID);
      if (adGroupIds.length > 0) {
        logger.info(`AgentOrchestrator: Found ${adGroupIds.length} ad groups to analyze.`);
        for (const adGroupId of adGroupIds) {
          logger.info(`--- Analyzing Ad Group ${adGroupId} ---`);
          await this.persuasionArchitect.rewriteAdCopy(adGroupId, OPERATING_CUSTOMER_ID);
        }
      } else {
        logger.info(`AgentOrchestrator: No ad groups to process for campaign ${CAMPAIGN_ID}.`);
      }

    } catch (error) {
      logger.error(`AgentOrchestrator: An error occurred during the operation cycle: ${error.message}`, error);
    } finally {
      await this.shutdown();
    }
  }

  async shutdown() {
    logger.info('AgentOrchestrator: Shutting down all agents...');
    await this.intentSurgeon.shutdown();
    await this.persuasionArchitect.shutdown();
    await this.roiSentry.shutdown();
    logger.info('AgentOrchestrator: Shutdown complete.');
  }
}

// Main execution block
if (require.main === module) {
  const orchestrator = new AgentOrchestrator();
  orchestrator.run().catch(error => {
    logger.error('Failed to run Agent Orchestrator:', error);
    process.exit(1);
  });
}

module.exports = AgentOrchestrator;
