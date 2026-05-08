const express = require('express');
const logger = require('../../common/logger');
const { SynapseError } = require('../../common/errors');

// Current Inter-Service Communication Model:
// Agents are instantiated directly within the Supervisor process.
// Communication happens via direct method calls.
// This simplifies initial development and is efficient for tightly coupled components
// running within the same process.

// Future Considerations for Scalability/Decoupling:
// For a true distributed microservices architecture, agents would run as separate processes.
// Communication would then typically involve:
// - Message Queues (e.g., RabbitMQ, Kafka) for asynchronous task dispatch and eventing.
// - gRPC/REST APIs for synchronous requests between services.

// Import Agent classes
const GoogleAdsApiManager = require('../services/google-ads-api-manager');
const IntentSurgeon = require('../agents/intent-surgeon');
const PersuasionArchitect = require('../agents/persuasion-architect');
const RoiSentry = require('../agents/roi-sentry');
const LocationSentry = require('../agents/location-sentry');

class Supervisor {
  constructor() {
    this.app = express();
    this.port = process.env.SUPERVISOR_PORT || 3001;
    this.agents = {};

    this.initAgents();
    this.setupRoutes();
  }

  initAgents() {
    logger.info('Supervisor: Initializing agents...');
    try {
      this.agents.googleAdsApiManager = new GoogleAdsApiManager();
      this.agents.intentSurgeon = new IntentSurgeon();
      this.agents.persuasionArchitect = new PersuasionArchitect();
      this.agents.roiSentry = new RoiSentry();
      this.agents.locationSentry = new LocationSentry();

      // Initialize any agents that require async setup (e.g., DB connection)
      // This pattern ensures the agent's internal setup is done
      if (typeof this.agents.intentSurgeon.initialize === 'function') {
        this.agents.intentSurgeon.initialize().catch(error => {
          logger.error(`Supervisor: Failed to initialize IntentSurgeon: ${error.message}`);
        });
      }

      logger.info('Supervisor: All agents initialized.');
    } catch (error) {
      logger.error('Supervisor: Error during agent initialization:', error);
      throw new SynapseError('Failed to initialize Supervisor agents', 'SUPERVISOR_INIT_FAILED', error);
    }
  }

  setupRoutes() {
    this.app.use(express.json()); // Enable JSON body parsing

    this.app.get('/status', (req, res) => {
      res.json({
        status: 'running',
        agents: Object.keys(this.agents).map(key => ({ name: key, status: 'initialized' })),
        timestamp: new Date().toISOString(),
      });
    });

    this.app.post('/optimize-campaign/:campaignId', async (req, res) => {
      const { campaignId } = req.params;
      const operatingCustomerId = req.body.operatingCustomerId || process.env.OPERATING_CUSTOMER_ID || GoogleAdsApiManager.DEFAULT_OPERATING_CUSTOMER_ID; // Assuming operatingCustomerId comes from request body or env

      if (!operatingCustomerId) {
        logger.error('Supervisor: Missing operatingCustomerId for optimize-campaign command.');
        return res.status(400).json({ error: 'operatingCustomerId is required.' });
      }

      logger.info(`Supervisor: Received optimize-campaign command for Campaign ID: ${campaignId}, Customer: ${operatingCustomerId}`);

      try {
        // Example workflow:
        // 1. Monitor budget (ROI Sentry)
        logger.info(`Supervisor: Running ROI Sentry for campaign ${campaignId}`);
        const roiStatus = await this.agents.roiSentry.monitorBudget(campaignId, operatingCustomerId);
        if (roiStatus.status === 'ALERT') {
          logger.warn(`Supervisor: ROI Sentry alert for campaign ${campaignId}: ${roiStatus.message}. Implementing safety pause.`);
          await this.agents.roiSentry.implementSafetyPausing(campaignId, operatingCustomerId);
          return res.status(202).json({
            message: `Campaign ${campaignId} paused due to budget alert.`,
            details: roiStatus,
          });
        }

        // 2. Analyze search terms and inject negatives (Intent Surgeon)
        logger.info(`Supervisor: Running Intent Surgeon for campaign ${campaignId}`);
        const negativeKeywords = await this.agents.intentSurgeon.analyzeSearchTerms(campaignId, operatingCustomerId);
        if (negativeKeywords.length > 0) {
          logger.info(`Supervisor: Identified ${negativeKeywords.length} negative keywords for campaign ${campaignId}. Injecting...`);
          await this.agents.intentSurgeon.injectNegativeKeywords(negativeKeywords, operatingCustomerId);
        } else {
          logger.info(`Supervisor: No new negative keywords identified for campaign ${campaignId}.`);
        }


        // 3. Prioritize Call-Only Ads and adjust location bids (Location Sentry)
        logger.info(`Supervisor: Running Location Sentry for campaign ${campaignId}`);
        await this.agents.locationSentry.prioritizeCallOnlyAds(operatingCustomerId); // This operates on medical intent campaigns, not necessarily specific to `campaignId`
        await this.agents.locationSentry.adjustLocationBids(operatingCustomerId); // This operates globally for Entebbe region

        // 4. Rewrite ad copy (Persuasion Architect) - This would typically be per ad group/ad
        // For demonstration, let's assume we want to rewrite ad copy for a specific ad group within this campaign
        // const adGroupId = 'someAdGroupId'; // This would come from an API call or another agent
        // logger.info(`Supervisor: Running Persuasion Architect for ad group ${adGroupId}`);
        // const rewrittenAd = await this.agents.persuasionArchitect.rewriteAdCopy(adGroupId, operatingCustomerId);
        // logger.info(`Supervisor: Ad copy rewritten for ad group ${adGroupId}: ${rewrittenAd.rewritten.headline}`);
        // // Then, use googleAdsApiManager to update the ad
        // await this.agents.googleAdsApiManager.updateAdCopy(operatingCustomerId, rewrittenAd.adId, rewrittenAd.rewritten.headline, rewrittenAd.rewritten.description);


        res.json({
          message: `Optimization workflow initiated for campaign ${campaignId} and customer ${operatingCustomerId}.`,
          details: {
            roiStatus: roiStatus,
            // negativeKeywordsInjected: negativeKeywords.length > 0,
            // adCopyRewritten: rewrittenAd ? true : false,
          },
        });
      } catch (error) {
        logger.error(`Supervisor: Error during optimization workflow for campaign ${campaignId}:`, error);
        res.status(500).json({ error: error.message, code: error.code || 'UNKNOWN_ERROR' });
      }
    });
  }

  start() {
    this.app.listen(this.port, () => {
      logger.info(`Supervisor service listening on port ${this.port}`);
    });
  }

  async shutdown() {
    logger.info('Supervisor: Shutting down agents...');
    for (const agentName in this.agents) {
      const agent = this.agents[agentName];
      if (typeof agent.shutdown === 'function') {
        await agent.shutdown();
      }
    }
    logger.info('Supervisor: All agents shut down.');
    // Optionally close express server if needed.
  }
}

module.exports = Supervisor;
