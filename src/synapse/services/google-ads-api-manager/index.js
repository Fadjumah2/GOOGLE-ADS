require('dotenv').config({ path: '../../../../.env' }); // Adjust path as needed
const { OAuth2Client } = require('google-auth-library');
const { GoogleAdsApi } = require('google-ads-api');
const logger = require('../../../common/logger'); // Import logger
const { GoogleAdsApiError, ValidationError } = require('../../../common/errors'); // Import custom errors

// Default IDs from user prompt
const DEFAULT_LOGIN_CUSTOMER_ID = '9018660123'; // Your Manager Account ID (MCC) without hyphens
const DEFAULT_OPERATING_CUSTOMER_ID = '6022317886'; // The specific customer account you want to manage

class GoogleAdsApiManager {
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI;
    this.refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    this.developerToken = process.env.DEVELOPER_TOKEN;

    if (!this.clientId || !this.clientSecret || !this.redirectUri || !this.refreshToken || !this.developerToken) {
      logger.warn('GoogleAdsApiManager: Missing one or more Google Ads API credentials in environment variables.');
    }

    this.oauth2Client = new OAuth2Client(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );

    if (this.refreshToken) {
      this.oauth2Client.setCredentials({ refresh_token: this.refreshToken });
    }

    this.googleAdsClient = new GoogleAdsApi({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      developer_token: this.developerToken,
      refresh_token: this.refreshToken,
      // login_customer_id will be handled dynamically per request
    });

    logger.info('GoogleAdsApiManager: Initialized.');
  }

  // Method to get a customer instance with dynamic login_customer_id
  _getCustomer(operatingCustomerId, loginCustomerId = DEFAULT_LOGIN_CUSTOMER_ID) {
    if (!operatingCustomerId) {
      throw new ValidationError('Operating Customer ID is required.');
    }
    return this.googleAdsClient.Customer({
      customer_id: operatingCustomerId,
      login_customer_id: loginCustomerId,
    });
  }

  // Generic method for querying Google Ads API
  async query(operatingCustomerId, query, loginCustomerId = DEFAULT_LOGIN_CUSTOMER_ID) {
    try {
      const customer = this._getCustomer(operatingCustomerId, loginCustomerId);
      const result = await customer.query(query);
      return result;
    } catch (error) {
      logger.error(new GoogleAdsApiError(`Error querying Google Ads API for customer ${operatingCustomerId}`, error));
      throw error;
    }
  }

  // Generic method for mutating (e.g., adding/updating/removing) Google Ads API
  async mutate(operatingCustomerId, operations, loginCustomerId = DEFAULT_LOGIN_CUSTOMER_ID) {
    try {
      const customer = this._getCustomer(operatingCustomerId, loginCustomerId);
      // The `mutate` method needs specific service and operation types.
      // This is a placeholder and would need to be expanded based on actual use cases.
      // Example: customer.campaigns.create, customer.adGroups.update, etc.
      logger.info(`GoogleAdsApiManager: Simulating mutate operation for customer ${operatingCustomerId}. Operations:`, JSON.stringify(operations, null, 2));
      return {
        success: true,
        message: 'Mutate operation simulated successfully.',
        operations: operations,
      };
    } catch (error) {
      logger.error(new GoogleAdsApiError(`Error mutating Google Ads API for customer ${operatingCustomerId}`, error));
      throw error;
    }
  }

  // Example method: Fetch campaigns
  async getCampaigns(operatingCustomerId, loginCustomerId = DEFAULT_LOGIN_CUSTOMER_ID) {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status
      FROM
        campaign
      ORDER BY
        campaign.id`;
    return this.query(operatingCustomerId, query, loginCustomerId);
  }

  // Example method: Add Negative Keyword to Campaign
  async addCampaignNegativeKeyword(operatingCustomerId, campaignId, keywordText, loginCustomerId = DEFAULT_LOGIN_CUSTOMER_ID) {
    const operations = [
      {
        create: {
          campaign: `customers/${operatingCustomerId}/campaigns/${campaignId}`,
          keyword: {
            text: keywordText,
            match_type: 'EXACT', // Enforcing EXACT match as per Intent Surgeon's priority
          },
          // CampaignCriterion specific fields, not AdGroupCriterion
          type: 'CAMPAIGN_CRITERION',
        },
      },
    ];
    // This is a simulation, real implementation would call `customer.campaignCriteria.create` or similar
    // The `mutate` method of google-ads-api is more complex and depends on the service.
    // For simplicity, we simulate a generic mutate here.
    return this.mutate(operatingCustomerId, operations, loginCustomerId);
  }

  // Placeholder for updating Ad Copy
  async updateAdCopy(operatingCustomerId, adGroupId, adId, newHeadline, newDescription, loginCustomerId = DEFAULT_LOGIN_CUSTOMER_ID) {
    const operations = [
      {
        update: {
          resource_name: `customers/${operatingCustomerId}/adGroupAds/${adGroupId}~${adId}`, // This resource name might vary based on ad type
          ad: {
            id: adId,
            final_urls: ['http://www.example.com'], // Placeholder, needs actual final URL
            expanded_text_ad: { // Assuming Expanded Text Ad for example
              headline_part1: newHeadline,
              description: newDescription,
            },
          },
          update_mask: 'ad.expanded_text_ad.headline_part1,ad.expanded_text_ad.description',
        },
      },
    ];
    return this.mutate(operatingCustomerId, operations, loginCustomerId);
  }
}

module.exports = GoogleAdsApiManager;
