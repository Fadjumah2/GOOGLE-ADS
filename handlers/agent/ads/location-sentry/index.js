import logger from '../../../utils/logger.js';
import { GoogleAdsApiError } from '../../../utils/error.js';

class LocationSentry {
  constructor(googleAdsApiManager) {
    logger.info('LocationSentry: Initializing...');
    if (!googleAdsApiManager) {
      logger.error('LocationSentry: GoogleAdsApiManager not provided.');
      throw new Error('GoogleAdsApiManager is required.');
    }
    this.googleAdsApiManager = googleAdsApiManager;
  }

  async fetchCampaignsWithAdExtensions(operatingCustomerId) {
    logger.info(`LocationSentry: Fetching campaigns and ad extensions for Customer: ${operatingCustomerId}`);

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.labels,
        ad_group.id,
        ad_group.name,
        ad_group_ad.ad.id,
        ad_group_ad.ad.type,
        ad_group_ad.status
      FROM
        campaign
        LEFT JOIN ad_group ON campaign.id = ad_group.campaign.id
        LEFT JOIN ad_group_ad ON ad_group.id = ad_group_ad.ad_group.id
      WHERE
        campaign.status IN ('ENABLED', 'PAUSED')
        AND ad_group.status IN ('ENABLED', 'PAUSED')
    `; // Simplified query, might need more specific joins/filters for ad extensions and labels

    try {
      const response = await this.googleAdsApiManager.query(operatingCustomerId, query);
      const campaignsMap = new Map();

      response.forEach(row => {
        const campaignId = row.campaign.id;
        if (!campaignsMap.has(campaignId)) {
          campaignsMap.set(campaignId, {
            campaignId: campaignId,
            campaignName: row.campaign.name,
            labels: (row.campaign.labels || []).map(label => label.name), // Assuming label.name contains the string 'MEDICAL_INTENT'
            adGroupIds: new Set(),
            adExtensions: [], // This part is tricky with GAQL, might need separate queries for actual extensions
          });
        }
        const campaign = campaignsMap.get(campaignId);
        if (row.ad_group && row.ad_group.id) {
          campaign.adGroupIds.add(row.ad_group.id);
        }
        // Simplified ad extension detection. In real scenario, would query for AdGroupExtensionSetting or CampaignExtensionSetting
        if (row.ad_group_ad && row.ad_group_ad.ad && row.ad_group_ad.ad.type === 'CALL_ONLY_AD' && row.ad_group_ad.status === 'ENABLED') {
          campaign.adExtensions.push({ type: 'CALL_ONLY', status: 'ENABLED', adId: row.ad_group_ad.ad.id });
        }
      });

      // Convert Set to Array for adGroupIds
      return Array.from(campaignsMap.values()).map(campaign => ({
        ...campaign,
        adGroupIds: Array.from(campaign.adGroupIds),
      }));
    } catch (error) {
      throw new GoogleAdsApiError(`Failed to fetch campaigns with ad extensions for customer ${operatingCustomerId}`, error);
    }
  }

  async identifyMedicalIntentCampaigns(operatingCustomerId) {
    const campaigns = await this.fetchCampaignsWithAdExtensions(operatingCustomerId);
    return campaigns.filter(campaign =>
      campaign.labels && campaign.labels.includes('MEDICAL_INTENT') // Filter based on a 'MEDICAL_INTENT' label
    );
  }

  async prioritizeCallOnlyAds(operatingCustomerId) {
    logger.info(`LocationSentry: Prioritizing Call-Only Ad extensions for Customer: ${operatingCustomerId}`);
    const medicalIntentCampaigns = await this.identifyMedicalIntentCampaigns(operatingCustomerId);
    const actionsTaken = [];

    for (const campaign of medicalIntentCampaigns) {
      const hasCallOnly = campaign.adExtensions.some(ext => ext.type === 'CALL_ONLY' && ext.status === 'ENABLED');
      if (!hasCallOnly) {
        logger.warn(`LocationSentry: Campaign '${campaign.campaignName}' (ID: ${campaign.campaignId}) identified as medical intent, but missing Call-Only Ad. Simulating creation/enablement.`);
        // Here, a call to Google Ads API Manager would create/enable Call-Only Ads.
        // This is a complex mutation, involving creating a CallOnlyAd and linking it as an AdGroupAd.
        // For now, we'll simulate the mutate.
        const operations = [
          // Example: Create an AdGroupAd with a CallOnlyAd (simplified)
          {
            create: {
              ad_group: `customers/${operatingCustomerId}/adGroups/${campaign.adGroupIds[0]}`, // Assuming first ad group for simplicity
              ad: {
                call_only_ad: {
                  country_code: 'UG', // Example country code for Uganda
                  phone_number: '+256771234567', // Example phone number
                  headline1: 'Call ENT Experts',
                  business_name: 'Eritage ENT Care',
                },
                final_urls: ['http://www.eritageentcare.com'], // Placeholder
                type: 'CALL_ONLY_AD',
              },
              status: 'ENABLED',
            }
          }
        ];
        try {
          const result = await this.googleAdsApiManager.mutate(operatingCustomerId, operations);
          actionsTaken.push({
            campaignId: campaign.campaignId,
            action: 'CREATED_OR_ENABLED_CALL_ONLY_AD',
            details: `Call-Only Ad created/enabled for campaign ${campaign.campaignId}. Result: ${JSON.stringify(result)}`,
          });
          logger.info(`LocationSentry: Call-Only Ad created/enabled for campaign ${campaign.campaignId}.`);
        } catch (error) {
          logger.error(new GoogleAdsApiError(`Failed to create/enable Call-Only Ad for campaign ${campaign.campaignId}: ${error.message}`, error));
          actionsTaken.push({
            campaignId: campaign.campaignId,
            action: 'FAILED_TO_CREATE_OR_ENABLE_CALL_ONLY_AD',
            details: error.message,
          });
        }
      } else {
        logger.info(`LocationSentry: Campaign '${campaign.campaignName}' (ID: ${campaign.campaignId}) already has Call-Only Ad enabled.`);
      }
    }
    return actionsTaken;
  }

  async adjustLocationBids(operatingCustomerId) {
    logger.info(`LocationSentry: Adjusting bids for 20km radius of Entebbe, Uganda for Customer: ${operatingCustomerId}`);
    const targetLatitude = 0.0468; // Approximate latitude for Entebbe
    const targetLongitude = 32.4447; // Approximate longitude for Entebbe
    const radiusKm = 20;
    const bidModifier = 1.2; // Example: Increase bids by 20%

    // This is a complex operation involving:
    // 1. Identifying campaigns/ad groups targeting the general Entebbe area.
    // 2. Creating or updating GeoTargetingType.LOCATION_TARGET bid modifiers.
    // This example simulates the mutation.
    const operations = [
      // Example: Update a campaign's location bid modifier (simplified)
      {
        update: {
          resource_name: `customers/${operatingCustomerId}/campaignBidModifiers/CAMPAIGN_ID~CRITERION_ID`, // Placeholder
          bid_modifier: bidModifier,
        },
      },
    ];

    try {
      // In a real scenario, you'd fetch existing campaign criterion for location,
      // find the one for Entebbe (or create it), and then apply the bid_modifier.
      // This is a simulated mutation for demonstration.
      const result = await this.googleAdsApiManager.mutate(operatingCustomerId, operations);
      logger.info(`LocationSentry: Simulated bid adjustment for Entebbe region. Result: ${JSON.stringify(result)}`);
      return {
        status: 'SUCCESS',
        details: `Bid adjustment simulated for Entebbe region.`,
        location: { latitude: targetLatitude, longitude: targetLongitude, radius: radiusKm },
        result: result,
      };
    } catch (error) {
      logger.error(new GoogleAdsApiError(`Failed to adjust location bids for customer ${operatingCustomerId}: ${error.message}`, error));
      return {
        status: 'FAILED',
        details: `Failed to adjust bid for Entebbe region: ${error.message}`,
        error: error.message,
      };
    }
  }


  async shutdown() {
    logger.info('LocationSentry: Shut down.');
  }
}

export default LocationSentry;
