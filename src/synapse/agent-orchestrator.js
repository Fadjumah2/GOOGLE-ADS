
const logger = require('../common/logger');
const db = require('../common/db');
const GoogleAdsApiManager = require('../services/google-ads-api-manager');
const IntentSurgeon = require('./agents/intent-surgeon');
const PersuasionArchitect = require('./agents/persuasion-architect');
const RoiSentry = require('./agents/roi-sentry');

class AgentOrchestrator {
  constructor() {
    logger.info('AgentOrchestrator: Initializing...');
    this.googleAdsApiManager = new GoogleAdsApiManager();
    this.intentSurgeon = new IntentSurgeon(this.googleAdsApiManager);
    this.persuasionArchitect = new PersuasionArchitect(this.googleAdsApiManager);
    this.roiSentry = new RoiSentry(this.googleAdsApiManager);
    logger.info('AgentOrchestrator: All agents initialized.');
  }

  async getCampaignConfiguration(campaignConfigId) {
    const query = 'SELECT customer_id, campaign_id FROM campaign_configurations WHERE id = $1';
    try {
      const { rows } = await db.query(query, [campaignConfigId]);
      if (rows.length === 0) {
        throw new Error(`Campaign configuration with ID ${campaignConfigId} not found.`);
      }
      return rows[0];
    } catch (error) {
      logger.error(`Error fetching campaign configuration: ${error.message}`);
      throw error;
    }
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

  async run(campaignConfigId) {
    logger.info('AgentOrchestrator: Starting autonomous operation cycle...');

    let customerId, campaignId;
    let agentRunId;

    try {
      const config = await this.getCampaignConfiguration(campaignConfigId);
      customerId = config.customer_id;
      campaignId = config.campaign_id;
      logger.info(`AgentOrchestrator: Running for Customer ID: ${customerId}, Campaign ID: ${campaignId}`);

      // Start a new agent run log
      const insertRunQuery = `
        INSERT INTO agent_runs (campaign_config_id, status, details)
        VALUES ($1, $2, $3)
        RETURNING id;
      `;
      const { rows: runRows } = await db.query(insertRunQuery, [campaignConfigId, 'running', {}]);
      agentRunId = runRows[0].id;
      logger.info(`AgentOrchestrator: Started new agent run with ID: ${agentRunId}`);

      // 1. ROI Sentry: Monitor budget and performance
      logger.info(`--- Running ROI Sentry for Campaign ${campaignId} ---`);
      const budgetStatus = await this.roiSentry.monitorBudget(campaignId, customerId, agentRunId);
      if (budgetStatus.status === 'ALERT') {
        logger.warn('AgentOrchestrator: ROI Sentry detected a budget alert. Pausing operations on this campaign for now.');
        // In a more complex scenario, we might pause the campaign here.
        // await this.roiSentry.implementSafetyPausing(campaignId, customerId);
        // return; // Stop processing for this campaign
      } else {
        logger.info('AgentOrchestrator: Budget status is OK.');
      }

      // 2. Intent Surgeon: Analyze and clean up search intent
      logger.info(`--- Running Intent Surgeon for Campaign ${campaignId} ---`);
      const negativeKeywords = await this.intentSurgeon.analyzeSearchTerms(campaignId, customerId, agentRunId);
      if (negativeKeywords && negativeKeywords.length > 0) {
        logger.info(`AgentOrchestrator: Intent Surgeon identified ${negativeKeywords.length} negative keywords.`);
        await this.intentSurgeon.injectNegativeKeywords(negativeKeywords, customerId, agentRunId);
      } else {
        logger.info('AgentOrchestrator: No new negative keywords identified.');
      }

      // 3. Persuasion Architect: Fetch Ad Groups and rewrite ad copy
      logger.info(`--- Running Persuasion Architect for Campaign ${campaignId} ---`);
      const adGroupIds = await this._getAdGroupIds(campaignId, customerId);
      if (adGroupIds.length > 0) {
        logger.info(`AgentOrchestrator: Found ${adGroupIds.length} ad groups to analyze.`);
        for (const adGroupId of adGroupIds) {
          logger.info(`--- Analyzing Ad Group ${adGroupId} ---`);
          await this.persuasionArchitect.rewriteAdCopy(adGroupId, customerId, agentRunId);
        }
      } else {
        logger.info(`AgentOrchestrator: No ad groups to process for campaign ${campaignId}.`);
      }

      // Update agent run status to completed
      if (agentRunId) {
        const updateRunQuery = `
          UPDATE agent_runs
          SET status = $1, details = $2
          WHERE id = $3;
        `;
        await db.query(updateRunQuery, ['completed', { message: 'Agent run completed successfully.' }, agentRunId]);
        logger.info(`AgentOrchestrator: Agent run ${agentRunId} marked as completed.`);
      }

    } catch (error) {
      logger.error(`AgentOrchestrator: An error occurred during the operation cycle: ${error.message}`, error);
      // Update agent run status to failed
      if (agentRunId) {
        const updateRunQuery = `
          UPDATE agent_runs
          SET status = $1, details = $2
          WHERE id = $3;
        `;
        await db.query(updateRunQuery, ['failed', { error: error.message, stack: error.stack }, agentRunId]);
        logger.info(`AgentOrchestrator: Agent run ${agentRunId} marked as failed.`);
      }
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
  const campaignConfigId = process.argv[2] || 1; // Default to ID 1 if not provided
  orchestrator.run(campaignConfigId).catch(error => {
    logger.error('Failed to run Agent Orchestrator:', error);
    process.exit(1);
  });
}

module.exports = AgentOrchestrator;
