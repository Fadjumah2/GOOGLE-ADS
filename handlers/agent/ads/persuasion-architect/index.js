import logger from '../../../utils/logger.js';
import db from '../../../utils/db.js';
import { GoogleAdsApiError } from '../../../utils/error.js';
import { generateContent, MODELS } from '../../../utils/geminiClient.js';

class PersuasionArchitect {
  constructor(googleAdsApiManager, model = MODELS.CORE) {
    this.model = model;
    this.apiKey = process.env.GEMINI_API_KEY;

    if (!this.apiKey) {
      logger.warn('PersuasionArchitect: GEMINI_API_KEY not set in environment variables. The agent will not be able to rewrite ad copy.');
    }

    if (!googleAdsApiManager) {
      logger.error('PersuasionArchitect: GoogleAdsApiManager not provided.');
      throw new Error('GoogleAdsApiManager is required.');
    }
    this.googleAdsApiManager = googleAdsApiManager;
  }

  // Placeholder for interaction with Google Ads API Manager Service
  async fetchAdCopyAndConversionData(adGroupId, operatingCustomerId) {
    logger.info(`PersuasionArchitect: Fetching ad copy and conversion data for ad group ${adGroupId} (Customer: ${operatingCustomerId})`);

    const adQuery = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.expanded_text_ad.headline_part1,
        ad_group_ad.ad.expanded_text_ad.description,
        ad_group_ad.status
      FROM
        ad_group_ad
      WHERE
        ad_group.id = ${adGroupId}
        AND ad_group_ad.ad.type = 'EXPANDED_TEXT_AD'
        AND ad_group_ad.status = 'ENABLED'
      LIMIT 1`; // Fetch one active Expanded Text Ad for simplicity

    const metricsQuery = `
      SELECT
        metrics.all_conversions,
        metrics.conversions,
        metrics.clicks,
        metrics.impressions,
        metrics.cost_micros
      FROM
        ad_group_ad
      WHERE
        ad_group.id = ${adGroupId}
        AND segments.date DURING LAST_30_DAYS
      LIMIT 1`; // Aggregate metrics for the ad group

    try {
      const adResponse = await this.googleAdsApiManager.query(operatingCustomerId, adQuery);
      if (!adResponse || adResponse.length === 0) {
        throw new Error(`No active Expanded Text Ads found for ad group ${adGroupId}.`);
      }
      const adData = adResponse[0].ad_group_ad;

      const metricsResponse = await this.googleAdsApiManager.query(operatingCustomerId, metricsQuery);
      const metricsData = metricsResponse && metricsResponse.length > 0 ? metricsResponse[0].metrics : {};

      return {
        adCopy: {
          headline: adData.ad.expanded_text_ad.headline_part1,
          description: adData.ad.expanded_text_ad.description,
          adId: adData.ad.id,
        },
        conversionData: {
          totalConversions: metricsData.conversions || 0,
          allConversions: metricsData.all_conversions || 0,
          clicks: metricsData.clicks || 0,
          impressions: metricsData.impressions || 0,
          cost: (metricsData.cost_micros / 1000000) || 0,
          conversionRate: (metricsData.clicks > 0 ? (metricsData.conversions / metricsData.clicks) : 0),
        }
      };
    } catch (error) {
      throw new GoogleAdsApiError(`Failed to fetch ad copy or conversion data for ad group ${adGroupId}`, error);
    }
  }

  async rewriteAdCopy(adGroupId, operatingCustomerId, agentRunId) {
    logger.info('PersuasionArchitect: Analyzing ad copy for rewriting...');

    let adCopy, conversionData;
    let newHeadline = null;
    let newDescription = null;
    let geminiResponse = null;
    let changeStatus = 'error';
    let errorMessage = null;

    try {
      ({ adCopy, conversionData } = await this.fetchAdCopyAndConversionData(adGroupId, operatingCustomerId));
    } catch (error) {
      errorMessage = `Could not fetch ad copy or conversion data for ad group ${adGroupId}: ${error.message}`;
      logger.error(`PersuasionArchitect: ${errorMessage}`);
      // Log error to database
      try {
        await db.query(
          `INSERT INTO persuasion_architect_logs (agent_run_id, ad_group_id, original_headline, original_description, change_status, applied_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [agentRunId, adGroupId, adCopy?.headline, adCopy?.description, 'error', { error: errorMessage }]
        );
      } catch (logError) {
        logger.error(`PersuasionArchitect: Failed to log error for ad group ${adGroupId}: ${logError.message}`);
      }
      return { adId: null, original: null, rewritten: null, error: errorMessage };
    }

    logger.info('Original Ad Copy:', adCopy);
    logger.info('Conversion Data:', conversionData);

    const prompt = `Task: Rewrite ad copy for higher conversion. 
Original: "${adCopy.headline}" - "${adCopy.description}"
Data: ${JSON.stringify(conversionData)}
Constraints: Headline max 30 chars, Description max 90 chars.
Output: JSON object with "headline" and "description" keys.`;

    try {
      const geminiResponseText = await generateContent(prompt, {
        model: this.model,
        temperature: 0.7,
        responseMimeType: 'application/json',
      });

      geminiResponse = JSON.parse(geminiResponseText);
      logger.info('PersuasionArchitect: Rewritten Ad Copy (parsed):', geminiResponse);

      newHeadline = (geminiResponse.headline || '').substring(0, 30);
      newDescription = (geminiResponse.description || '').substring(0, 90);

      logger.info('PersuasionArchitect: Final copy:');
      logger.info('  Headline:', newHeadline);
      logger.info('  Description:', newDescription);

      // Update the ad in Google Ads
      if (adCopy.adId) {
        logger.info(`PersuasionArchitect: Updating ad ${adCopy.adId} with new copy.`);
        await this.googleAdsApiManager.updateAdCopy(operatingCustomerId, adGroupId, adCopy.adId, newHeadline, newDescription);
        logger.info(`PersuasionArchitect: Ad ${adCopy.adId} updated successfully.`);
        changeStatus = 'applied';
      } else {
        logger.warn('PersuasionArchitect: Cannot update ad copy, adId is missing.');
        changeStatus = 'suggested'; // No adId means it was only suggested, not applied
      }

      // Log success to database
      try {
        await db.query(
          `INSERT INTO persuasion_architect_logs (agent_run_id, ad_group_id, original_headline, new_headline, original_description, new_description, change_status, applied_at, gemini_response)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
          [agentRunId, adGroupId, adCopy.headline, newHeadline, adCopy.description, newDescription, changeStatus, geminiResponseText]
        );
        logger.info(`PersuasionArchitect: Logged ad copy rewrite for ad group ${adGroupId} (Run: ${agentRunId}). Status: ${changeStatus}`);
      } catch (logError) {
        logger.error(`PersuasionArchitect: Failed to log ad copy rewrite for ad group ${adGroupId}: ${logError.message}`);
      }

      return {
        adId: adCopy.adId,
        original: { headline: adCopy.headline, description: adCopy.description },
        rewritten: {
          headline: newHeadline,
          description: newDescription,
        },
        geminiResponse: geminiResponseText,
      };

    } catch (error) {
      errorMessage = `PersuasionArchitect: Error rewriting ad copy or updating Google Ads API: ${error.message}`;
      logger.error(new GoogleAdsApiError(errorMessage, error));
      changeStatus = 'error';

      // Log error to database
      try {
        await db.query(
          `INSERT INTO persuasion_architect_logs (agent_run_id, ad_group_id, original_headline, new_headline, original_description, new_description, change_status, applied_at, gemini_response)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
          [agentRunId, adGroupId, adCopy.headline, newHeadline, adCopy.description, newDescription, changeStatus, { error: errorMessage, stack: error.stack }]
        );
      } catch (logError) {
        logger.error(`PersuasionArchitect: Failed to log error for ad group ${adGroupId}: ${logError.message}`);
      }

      return {
        adId: adCopy.adId,
        original: { headline: adCopy.headline, description: adCopy.description },
        rewritten: {
          headline: adCopy.headline, // Revert to original on error
          description: adCopy.description, // Revert to original on error
        },
        error: error.message,
      };
    }
  }

  async shutdown() {
    logger.info('PersuasionArchitect: Shut down.');
  }
}

export default PersuasionArchitect;
