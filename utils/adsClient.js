import { GoogleAdsApi } from 'google-ads-api';
import { refreshAccessToken } from '../services/googleAuthService.js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import logger from './logger.js';

// --- RATE LIMITING ---
// GBP uses a 300ms delay. Ads API is more complex but we'll apply a similar 
// conservative approach initially to ensure compliance.
let lastRequestTime = 0;
const MIN_DELAY_MS = 500; 

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const throttle = async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_DELAY_MS) {
        const delay = MIN_DELAY_MS - elapsed;
        logger.info(`[ADS RATE LIMIT] delaying ${delay}ms`);
        await sleep(delay);
    }
    lastRequestTime = Date.now();
};

// --- AUTH ---
const getAuthenticatedClient = async (req) => {
    const { access_token } = await refreshAccessToken(req);
    
    // GoogleAdsApi configuration
    return new GoogleAdsApi({
        client_id: process.env.GBP_CLIENT_ID,
        client_secret: process.env.GBP_CLIENT_SECRET,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN, // Assuming this is used
        // login_customer_id is required for MCC or child accounts
        login_customer_id: process.env.LOGIN_CUSTOMER_ID, 
    });
};

// --- STRUCTURED ERROR EXTRACTION ---
const extractAdsError = (error, operation) => {
    logger.error(`[ADS ERROR] ${operation}:`, error);

    return {
        success: false,
        error: `${operation}_FAILED`,
        message: error.message || 'An unknown error occurred in Google Ads API.',
        details: error.errors || []
    };
};

// --- API CLIENT ---
class AdsClient {
    constructor(req) {
        this.req = req;
    }

    async getClient() {
        return await getAuthenticatedClient(this.req);
    }

    async query(customerId, query) {
        try {
            await throttle();
            const client = await this.getClient();
            const customer = client.Customer({ customer_id: customerId, refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
            return await customer.query(query);
        } catch (error) {
            return extractAdsError(error, 'QUERY_ADS');
        }
    }

    async mutate(customerId, operations) {
        try {
            await throttle();
            const client = await this.getClient();
            const customer = client.Customer({ customer_id: customerId, refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
            return await customer.mutate(operations);
        } catch (error) {
            return extractAdsError(error, 'MUTATE_ADS');
        }
    }
}

export default (req) => new AdsClient(req);
