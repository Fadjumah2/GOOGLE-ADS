import axios from 'axios';
import { google } from 'googleapis';
import { Storage } from '@google-cloud/storage';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { refreshAccessToken } from '../services/googleAuthService.js';

export default (req) => {
    // Use proxy agent if HTTPS_PROXY is set (needed in some hosted environments)
    const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
    const httpsAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
    const axiosConfig = httpsAgent ? { httpsAgent, proxy: false } : {};

    // --- RATE LIMITING ---
    let lastRequestTime = 0;
    const MIN_DELAY_MS = 300;

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const throttle = async () => {
        const now = Date.now();
        const elapsed = now - lastRequestTime;
        if (elapsed < MIN_DELAY_MS) {
            const delay = MIN_DELAY_MS - elapsed;
            console.log(`[GBP RATE LIMIT] delaying ${delay}ms`);
            await sleep(delay);
        }
        lastRequestTime = Date.now();
    };

    // --- AUTH ---

    const getFreshAccessToken = async () => {
        const { access_token } = await refreshAccessToken(req);
        return access_token;
    };

    const getAuthenticatedClient = async () => {
        const accessToken = await getFreshAccessToken();
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });
        return auth;
    };

    // --- STRUCTURED GBP ERROR EXTRACTION ---
    // Extracts meaningful error info from Google API responses instead of
    // returning the raw axios error message which is often just "Request failed with status 403".

    const extractGBPError = (error, operation) => {
        const status = error.response?.status;
        const gbp = error.response?.data?.error;

        // Log full Google error body for server-side diagnosis
        if (error.response?.data) {
            console.error(`[GBP ERROR] ${operation} HTTP ${status}:`, JSON.stringify(error.response.data));
        }

        let errorCode;
        switch (status) {
            case 400: errorCode = 'INVALID_ARGUMENT'; break;
            case 401: errorCode = 'UNAUTHENTICATED'; break;
            case 403: errorCode = 'PERMISSION_DENIED'; break;
            case 404: errorCode = 'NOT_FOUND'; break;
            case 409: errorCode = 'ALREADY_EXISTS'; break;
            case 429: errorCode = 'RATE_LIMITED'; break;
            default:  errorCode = `${operation}_FAILED`;
        }

        return {
            success: false,
            error: errorCode,
            message: gbp?.message || error.message,
            ...(gbp?.status  && { googleStatus: gbp.status }),
            ...(gbp?.details && { details: gbp.details })
        };
    };

    // --- API CLIENT FUNCTIONS ---

    /**
     * Fetches reviews. Supports pagination via optional pageToken.
     * Response includes nextPageToken when more pages exist.
     */
    const fetchReviews = async (pageToken = null) => {
        try {
            await throttle();
            const accessToken = await getFreshAccessToken();
            const accountId = (process.env.GBP_ACCOUNT_ID || '').replace('accounts/', '');
            const locationId = (process.env.GBP_LOCATION_ID || '').replace('locations/', '');

            if (!accountId || !locationId) {
                throw new Error('GBP_ACCOUNT_ID or GBP_LOCATION_ID is not set in environment variables.');
            }

            const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`;
            console.log(`[GBP DEBUG] Fetching reviews from (v4): ${url}`);
            const params = { pageSize: 50 };
            if (pageToken) params.pageToken = pageToken;

            const response = await axios.get(url, {
                ...axiosConfig,
                headers: { Authorization: `Bearer ${accessToken}` },
                params,
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('Failed to fetch reviews:', error.message);
            return extractGBPError(error, 'FETCH_REVIEWS');
        }
    };

    /**
     * Replies to a review.
     * reviewName must be the full resource path: accounts/{id}/locations/{id}/reviews/{id}
     * Payload: { comment: "..." } per GBP Reviews API v1 ReviewReply resource spec.
     */
    const replyToReview = async (reviewName, replyText) => {
        try {
            await throttle();
            const accessToken = await getFreshAccessToken();
            const url = `https://mybusiness.googleapis.com/v4/${reviewName}/reply`;

            await axios.put(url, { comment: replyText }, {
                ...axiosConfig,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                timeout: 10000
            });

            console.log(`Reply sent to review: ${reviewName}`);
            return { success: true };
        } catch (error) {
            console.error(`Reply failed for review ${reviewName}:`, error.message);
            return extractGBPError(error, 'REPLY_TO_REVIEW');
        }
    };

    /**
     * Deletes the owner's reply to a review.
     * reviewName must be the full resource path: accounts/{id}/locations/{id}/reviews/{id}
     * Note: This deletes the OWNER REPLY only — customer reviews cannot be deleted via API.
     */
    const deleteReviewReply = async (reviewName) => {
        try {
            await throttle();
            const accessToken = await getFreshAccessToken();
            const url = `https://mybusiness.googleapis.com/v4/${reviewName}/reply`;

            await axios.delete(url, {
                ...axiosConfig,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                timeout: 10000,
            });

            console.log(`Reply deleted for review: ${reviewName}`);
            return { success: true };
        } catch (error) {
            console.error(`Delete reply failed for review ${reviewName}:`, error.message);
            return extractGBPError(error, 'DELETE_REVIEW_REPLY');
        }
    };

    /**
     * Fetches the location profile from the Business Information API.
     */
    const getProfile = async () => {
        try {
            await throttle();
            const accessToken = await getFreshAccessToken();
            const locationId = (process.env.GBP_LOCATION_ID || '').replace('locations/', '');

            if (!locationId) throw new Error('GBP_LOCATION_ID is not set.');

            const readMask = [
                'name',
                'title',
                'storefrontAddress',
                'websiteUri',
                'regularHours',
                'phoneNumbers',
                'categories',
                'metadata',
                'latlng',
                'profile'
            ].join(',');

            const url = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locationId}?readMask=${encodeURIComponent(readMask)}`;

            try {
                const response = await axios.get(url, {
                    ...axiosConfig,
                    headers: { Authorization: `Bearer ${accessToken}` },
                    timeout: 10000
                });
                return response.data;
            } catch (v1Error) {
                if (v1Error.response?.status === 403 || v1Error.response?.status === 404) {
                    console.warn(`[GBP] Business Information API v1 failed (${v1Error.response.status}), attempting fallback to v4...`);
                    
                    // Fallback to v4 (older endpoint, but often more reliably enabled)
                    // Note: v4 uses a different structure and doesn't support readMask, but it returns the core location data.
                    const accountId = (process.env.GBP_ACCOUNT_ID || '').replace('accounts/', '');
                    if (accountId) {
                        const v4Url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}`;
                        const v4Response = await axios.get(v4Url, {
                            ...axiosConfig,
                            headers: { Authorization: `Bearer ${accessToken}` },
                            timeout: 10000
                        });
                        console.log('[GBP] Fallback to v4 successful.');
                        return v4Response.data;
                    }
                }
                throw v1Error;
            }
        } catch (error) {
            if (error.response?.status === 403) {
                console.error('FAILED_GET_PROFILE_403: Permission denied. Ensure "Business Profile Business Information API" is enabled in GCP and the account has access.');
            }
            console.error('Failed to fetch profile:', error.message);
            return extractGBPError(error, 'GET_PROFILE');
        }
    };

    /**
     * Resolves a requested period into a concrete {startDate, endDate} range.
     * Accepted options (in order of precedence):
     *   - startDate + endDate: ISO strings (YYYY-MM-DD) or Date objects
     *   - period: 'last7' | 'last28' | 'last90' | 'last180' | 'last365' |
     *             'thisMonth' | 'lastMonth' | 'thisYear'
     *   - days: positive integer (1..540) — rolling window ending today
     * Defaults to last 28 days if nothing is supplied.
     * Google's Business Profile Performance API supports ~18 months of history,
     * so we cap `days` at 540.
     */
    const resolveInsightsRange = ({ startDate, endDate, period, days } = {}) => {
        const MAX_DAYS = 540;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (startDate && endDate) {
            const s = startDate instanceof Date ? startDate : new Date(startDate);
            const e = endDate   instanceof Date ? endDate   : new Date(endDate);
            if (isNaN(s) || isNaN(e)) throw new Error('Invalid startDate/endDate — use YYYY-MM-DD.');
            if (s > e) throw new Error('startDate must be on or before endDate.');
            return { startDate: s, endDate: e };
        }

        if (period) {
            const e = new Date(today);
            const s = new Date(today);
            switch (period) {
                case 'last7':      s.setDate(e.getDate() - 7);   return { startDate: s, endDate: e };
                case 'last28':     s.setDate(e.getDate() - 28);  return { startDate: s, endDate: e };
                case 'last90':     s.setDate(e.getDate() - 90);  return { startDate: s, endDate: e };
                case 'last180':    s.setDate(e.getDate() - 180); return { startDate: s, endDate: e };
                case 'last365':    s.setDate(e.getDate() - 365); return { startDate: s, endDate: e };
                case 'thisMonth': {
                    const start = new Date(today.getFullYear(), today.getMonth(), 1);
                    return { startDate: start, endDate: e };
                }
                case 'lastMonth': {
                    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    const end   = new Date(today.getFullYear(), today.getMonth(), 0);
                    return { startDate: start, endDate: end };
                }
                case 'thisYear': {
                    const start = new Date(today.getFullYear(), 0, 1);
                    return { startDate: start, endDate: e };
                }
                default:
                    throw new Error(`Unknown period: ${period}`);
            }
        }

        const n = Math.max(1, Math.min(MAX_DAYS, parseInt(days, 10) || 28));
        const e = new Date(today);
        const s = new Date(today);
        s.setDate(e.getDate() - n);
        return { startDate: s, endDate: e };
    };

    /**
     * Fetches performance metrics for a configurable date range (default: last 28 days).
     * Metrics: impressions, calls, website clicks, directions, and bookings.
     *
     * @param {Object} [options]
     * @param {string|Date} [options.startDate] - ISO date (YYYY-MM-DD) or Date
     * @param {string|Date} [options.endDate]   - ISO date (YYYY-MM-DD) or Date
     * @param {string}      [options.period]    - named preset, see resolveInsightsRange
     * @param {number}      [options.days]      - rolling window size, 1..540
     */
    const getInsights = async (options = {}) => {
        try {
            await throttle();
            const accessToken = await getFreshAccessToken();
            const locationId = (process.env.GBP_LOCATION_ID || '').replace('locations/', '');

            if (!locationId) throw new Error('GBP_LOCATION_ID is not set.');

            const { startDate, endDate } = resolveInsightsRange(options);

            // fetchMultiDailyMetricsTimeSeries is a GET endpoint — all params go in the query string.
            const metrics = [
                'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
                'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
                'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
                'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
                'CALL_CLICKS',
                'WEBSITE_CLICKS',
                'BUSINESS_DIRECTION_REQUESTS'
            ];
            const params = new URLSearchParams();
            metrics.forEach(m => params.append('dailyMetrics', m));
            params.append('dailyRange.start_date.year',  startDate.getFullYear());
            params.append('dailyRange.start_date.month', startDate.getMonth() + 1);
            params.append('dailyRange.start_date.day',   startDate.getDate());
            params.append('dailyRange.end_date.year',    endDate.getFullYear());
            params.append('dailyRange.end_date.month',   endDate.getMonth() + 1);
            params.append('dailyRange.end_date.day',     endDate.getDate());

            const url = `https://businessprofileperformance.googleapis.com/v1/locations/${locationId}:fetchMultiDailyMetricsTimeSeries?${params.toString()}`;

            const response = await axios.get(url, {
                ...axiosConfig,
                headers: { Authorization: `Bearer ${accessToken}` },
                timeout: 15000
            });

            const iso = (d) => d.toISOString().slice(0, 10);
            return {
                ...response.data,
                range: { startDate: iso(startDate), endDate: iso(endDate) }
            };
        } catch (error) {
            const status = error.response?.status;
            const googleMsg = error.response?.data?.error?.message || error.message;
            console.error(`Failed to fetch insights (HTTP ${status}):`, googleMsg);
            if (error.response?.data) {
                console.error('[GBP INSIGHTS] full error body:', JSON.stringify(error.response.data));
            }

            if (status === 404) {
                return {
                    success: false,
                    error: 'PERFORMANCE_API_NOT_FOUND',
                    message:
                        'The Business Profile Performance API returned 404 (Not Found). ' +
                        'Two likely causes: ' +
                        '(1) The "Business Profile Performance API" is not enabled for your GCP project — ' +
                        'go to console.cloud.google.com/apis/library, search "Business Profile Performance API", and enable it. ' +
                        '(2) The location is not verified on Google — unverified locations have no performance data. ' +
                        `Google error detail: ${googleMsg}`
                };
            }

            if (status === 403) {
                return {
                    success: false,
                    error: 'PERFORMANCE_API_PERMISSION_DENIED',
                    message:
                        'Permission denied fetching performance data. ' +
                        'Ensure the "Business Profile Performance API" is enabled in your GCP project and ' +
                        'the service account (or OAuth user) has the business.manage scope. ' +
                        `Google error detail: ${googleMsg}`
                };
            }

            return extractGBPError(error, 'GET_INSIGHTS');
        }
    };

    /**
     * Fetches verification status for the location.
     */
    const getVerificationStatus = async () => {
        try {
            await throttle();
            const accessToken = await getFreshAccessToken();
            const locationId = (process.env.GBP_LOCATION_ID || '').replace('locations/', '');

            if (!locationId) throw new Error('GBP_LOCATION_ID is not set.');

            const url = `https://mybusinessverifications.googleapis.com/v1/locations/${locationId}/verifications`;

            const response = await axios.get(url, {
                ...axiosConfig,
                headers: { Authorization: `Bearer ${accessToken}` },
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('Failed to fetch verification status:', error.message);
            return extractGBPError(error, 'GET_VERIFICATION_STATUS');
        }
    };

    /**
     * Fetches available attributes for the location based on its category.
     */
    const getAttributes = async () => {
        try {
            await throttle();
            const accessToken = await getFreshAccessToken();
            const locationId = (process.env.GBP_LOCATION_ID || '').replace('locations/', '');

            if (!locationId) throw new Error('GBP_LOCATION_ID is not set.');

            const url = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locationId}/attributes`;

            const response = await axios.get(url, {
                ...axiosConfig,
                headers: { Authorization: `Bearer ${accessToken}` },
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('Failed to fetch attributes:', error.message);
            return extractGBPError(error, 'GET_ATTRIBUTES');
        }
    };

    /**
     * Fetches local posts. Supports pagination via optional pageToken.
     */
    const getPosts = async (pageToken = null) => {
        try {
            await throttle();
            const accessToken = await getFreshAccessToken();
            const accountId = (process.env.GBP_ACCOUNT_ID || '').replace('accounts/', '');
            const locationId = (process.env.GBP_LOCATION_ID || '').replace('locations/', '');

            if (!accountId || !locationId) throw new Error('GBP_ACCOUNT_ID or GBP_LOCATION_ID is not set.');

            const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;
            const params = {};
            if (pageToken) params.pageToken = pageToken;

            const response = await axios.get(url, {
                ...axiosConfig,
                headers: { Authorization: `Bearer ${accessToken}` },
                params,
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('Failed to fetch posts:', error.message);
            return extractGBPError(error, 'GET_POSTS');
        }
    };

    /**
     * Lists all locations for the account.
     */
    const getLocations = async () => {
        try {
            await throttle();
            const accessToken = await getFreshAccessToken();
            const accountId = (process.env.GBP_ACCOUNT_ID || '').replace('accounts/', '');

            if (!accountId) throw new Error('GBP_ACCOUNT_ID is not set.');

            const url = `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations` +
                `?readMask=name,title,storefrontAddress`;

            const response = await axios.get(url, {
                ...axiosConfig,
                headers: { Authorization: `Bearer ${accessToken}` },
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('Failed to list locations:', error.message);
            return extractGBPError(error, 'LIST_LOCATIONS');
        }
    };

    /**
     * Updates the location profile.
     * updateMask is a comma-separated list of field paths to update.
     * Updatable fields: title, storefrontAddress, websiteUri, regularHours,
     *   phoneNumbers, categories, description, serviceAreas, attributes
     */
    const updateProfile = async (updateData, updateMask) => {
        try {
            await throttle();
            const accessToken = await getFreshAccessToken();
            const locationId = (process.env.GBP_LOCATION_ID || '').replace('locations/', '');

            if (!locationId) throw new Error('GBP_LOCATION_ID is not set.');

            const url = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locationId}?updateMask=${updateMask}`;

            const response = await axios.patch(url, updateData, {
                ...axiosConfig,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('Failed to update profile:', error.message);
            return extractGBPError(error, 'UPDATE_PROFILE');
        }
    };

    /**
     * Creates a local post.
     * Required fields: languageCode (e.g. "en"), summary (max 1500 chars)
     * Optional: callToAction { actionType, url }, media [{ sourceUrl, mediaFormat }],
     *   schedule { startTime }, recurrenceInfo { frequency, count }
     */
    const createPost = async (postData) => {
        try {
            await throttle();
            const accessToken = await getFreshAccessToken();
            const accountId = (process.env.GBP_ACCOUNT_ID || '').replace('accounts/', '');
            const locationId = (process.env.GBP_LOCATION_ID || '').replace('locations/', '');

            if (!accountId || !locationId) throw new Error('GBP_ACCOUNT_ID or GBP_LOCATION_ID is not set.');

            const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;

            const response = await axios.post(url, postData, {
                ...axiosConfig,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('Failed to create post:', error.message);
            return extractGBPError(error, 'CREATE_POST');
        }
    };

    /**
     * Deletes a local post.
     * postName must be the full resource path: accounts/{id}/locations/{id}/localPosts/{id}
     */
    const deletePost = async (postName) => {
        try {
            await throttle();
            const accessToken = await getFreshAccessToken();
            const url = `https://mybusiness.googleapis.com/v4/${postName}`;

            await axios.delete(url, {
                ...axiosConfig,
                headers: { Authorization: `Bearer ${accessToken}` },
                timeout: 10000
            });

            console.log(`Deleted post: ${postName}`);
            return { success: true };
        } catch (error) {
            console.error(`Delete failed for post ${postName}:`, error.message);
            return extractGBPError(error, 'DELETE_POST');
        }
    };

    // NOTE: fetchQuestions and replyToQuestion are NOT called from the route handlers
    // (those return 410 immediately) but are kept here for documentation purposes.
    // The My Business Q&A API was permanently discontinued on November 3, 2025.
    const fetchQuestions = async () => ({
        success: false,
        error: 'API_DISCONTINUED',
        message: 'The Google Business Profile Q&A API was permanently discontinued on November 3, 2025.'
    });

    const replyToQuestion = async () => ({
        success: false,
        error: 'API_DISCONTINUED',
        message: 'The Google Business Profile Q&A API was permanently discontinued on November 3, 2025.'
    });

    /**
     * Lists media items. Supports pagination via optional pageToken.
     */
    const listMedia = async (pageToken = null) => {
        try {
            await throttle();
            const accessToken = await getFreshAccessToken();
            const accountId = (process.env.GBP_ACCOUNT_ID || '').replace('accounts/', '');
            const locationId = (process.env.GBP_LOCATION_ID || '').replace('locations/', '');

            if (!accountId || !locationId) throw new Error('GBP_ACCOUNT_ID or GBP_LOCATION_ID is not set.');

            const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/media`;
            const params = {};
            if (pageToken) params.pageToken = pageToken;

            const response = await axios.get(url, {
                ...axiosConfig,
                headers: { Authorization: `Bearer ${accessToken}` },
                params,
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('Failed to list media:', error.message);
            return extractGBPError(error, 'LIST_MEDIA');
        }
    };

    /**
     * Fetches the service list (via the location resource's serviceItems field).
     */
    const getServiceList = async () => {
        try {
            await throttle();
            const accessToken = await getFreshAccessToken();
            const locationId = (process.env.GBP_LOCATION_ID || '').replace('locations/', '');

            if (!locationId) throw new Error('GBP_LOCATION_ID is not set.');

            const url = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locationId}?readMask=serviceItems`;
            console.log(`[GBP DEBUG] Fetching service list from: ${url}`);

            const response = await axios.get(url, {
                ...axiosConfig,
                headers: { Authorization: `Bearer ${accessToken}` },
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('Failed to fetch service list:', error.message);
            return extractGBPError(error, 'GET_SERVICE_LIST');
        }
    };

    /**
     * Updates the service list.
     * serviceListData must be a GBP location resource fragment: { serviceItems: [...] }
     * Default updateMask covers the full serviceItems array.
     */
    const updateServiceList = async (serviceListData, updateMask = 'serviceItems') => {
        try {
            await throttle();
            const accessToken = await getFreshAccessToken();
            const locationId = (process.env.GBP_LOCATION_ID || '').replace('locations/', '');

            if (!locationId) throw new Error('GBP_LOCATION_ID is not set.');

            const url = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locationId}?updateMask=${updateMask}`;

            const response = await axios.patch(url, serviceListData, {
                ...axiosConfig,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('Failed to update service list:', error.message);
            return extractGBPError(error, 'UPDATE_SERVICE_LIST');
        }
    };

    /**
     * Uploads a media item via sourceUrl.
     * mediaData must include: mediaFormat ("PHOTO" | "VIDEO"), sourceUrl (string),
     * and locationAssociation.category (e.g. "COVER_PHOTO", "PROFILE_COVER", "ADDITIONAL")
     */
    const uploadMedia = async (mediaData) => {
        try {
            await throttle();
            const accessToken = await getFreshAccessToken();
            const accountId = (process.env.GBP_ACCOUNT_ID || '').replace('accounts/', '');
            const locationId = (process.env.GBP_LOCATION_ID || '').replace('locations/', '');

            if (!accountId || !locationId) throw new Error('GBP_ACCOUNT_ID or GBP_LOCATION_ID is not set.');

            const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/media`;

            const response = await axios.post(url, mediaData, {
                ...axiosConfig,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('Failed to upload media:', error.message);
            return extractGBPError(error, 'UPLOAD_MEDIA');
        }
    };

    /**
     * Deletes a media item by its full resource name.
     * mediaId must be the full resource path: accounts/{id}/locations/{id}/media/{id}
     */
    const deleteMedia = async (mediaId) => {
        try {
            await throttle();
            const accessToken = await getFreshAccessToken();
            const url = `https://mybusiness.googleapis.com/v4/${mediaId}`;

            await axios.delete(url, {
                ...axiosConfig,
                headers: { Authorization: `Bearer ${accessToken}` },
                timeout: 10000,
            });

            console.log(`Media deleted: ${mediaId}`);
            return { success: true };
        } catch (error) {
            console.error(`Failed to delete media ${mediaId}:`, error.message);
            return extractGBPError(error, 'DELETE_MEDIA');
        }
    };

    const getSignedUrl = async (filename, contentType) => {
        try {
            await throttle();
            const storage = new Storage({
                authClient: await getAuthenticatedClient(),
            });
            const bucketName = process.env.GCS_BUCKET_NAME;

            if (!bucketName) {
                throw new Error('GCS_BUCKET_NAME environment variable not set.');
            }

            const options = {
                version: 'v4',
                action: 'write',
                expires: Date.now() + 15 * 60 * 1000, // 15 minutes
                contentType,
            };

            const [url] = await storage.bucket(bucketName).file(filename).getSignedUrl(options);
            const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
            return { success: true, signedUrl: url, publicUrl };
        } catch (error) {
            console.error('Failed to get signed URL:', error.message);
            return extractGBPError(error, 'GET_SIGNED_URL');
        }
    };

    return {
        getAuthenticatedClient,
        fetchReviews,
        replyToReview,
        deleteReviewReply,
        getProfile,
        getInsights,
        getVerificationStatus,
        getAttributes,
        getPosts,
        getLocations,
        updateProfile,
        createPost,
        deletePost,
        fetchQuestions,
        replyToQuestion,
        listMedia,
        getServiceList,
        updateServiceList,
        uploadMedia,
        deleteMedia,
        getSignedUrl
    };
};
