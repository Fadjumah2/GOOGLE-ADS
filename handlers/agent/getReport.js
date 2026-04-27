import { getInsights, fetchReviews } from '../../utils/gbpClient.js';
import { normalizeReviews } from '../../utils/normalizeGBPResponse.js';
import { generateText } from '../../utils/geminiClient.js';
import logger from '../../utils/logger.js';

export default async (req, res) => {
    try {
        const { period = 'last28' } = req.query;

        const [rawInsights, rawReviews] = await Promise.all([
            getInsights({ period }),
            fetchReviews()
        ]);

        const { reviews = [] } = normalizeReviews(rawReviews);
        
        // Calculate basic stats
        const avgRating = reviews.length > 0 
            ? (reviews.reduce((acc, r) => acc + parseInt(r.starRating.replace('STAR_RATING_', '')), 0) / reviews.length).toFixed(1)
            : 0;

        const metrics = rawInsights.multiDailyMetricTimeSeries || [];
        const findTotal = (id) => {
            const m = metrics.find(ts => ts.dailyMetricTimeSeries[0]?.dailyMetric === id);
            if (!m) return 0;
            return m.dailyMetricTimeSeries[0].timeSeries.values.reduce((acc, v) => acc + (parseInt(v.value) || 0), 0);
        };

        const stats = {
            impressions: findTotal('BUSINESS_IMPRESSIONS_DESKTOP_MAPS') + 
                         findTotal('BUSINESS_IMPRESSIONS_DESKTOP_SEARCH') +
                         findTotal('BUSINESS_IMPRESSIONS_MOBILE_MAPS') +
                         findTotal('BUSINESS_IMPRESSIONS_MOBILE_SEARCH'),
            calls: findTotal('CALL_CLICKS'),
            website: findTotal('WEBSITE_CLICKS'),
            directions: findTotal('BUSINESS_DIRECTION_REQUESTS'),
            reviewsCount: reviews.length,
            avgRating
        };

        const prompt = `
You are a senior business consultant for Eritage ENT Care.
Write a professional, 3-paragraph executive summary for the monthly performance report based on these metrics:

METRICS (Last 28 Days):
- Total Profile Views: ${stats.impressions}
- Phone Calls: ${stats.calls}
- Website Visits: ${stats.website}
- Direction Requests: ${stats.directions}
- New Reviews: ${stats.reviewsCount}
- Average Rating: ${stats.avgRating} Stars

TASK:
1. Paragraph 1: High-level overview of visibility and patient reach.
2. Paragraph 2: Engagement trends (calls, clicks, directions) and what they mean for the clinic.
3. Paragraph 3: Reputation summary and 1-2 strategic recommendations for next month.

Keep the tone encouraging but professional.
`;

        const summary = await generateText(prompt, { temperature: 0.5 });

        res.json({
            success: true,
            report: {
                stats,
                summary,
                generatedAt: new Date().toISOString(),
                period
            }
        });
    } catch (error) {
        logger.error(`Failed to generate report: ${error.message}`);
        res.status(500).json({ success: false, error: 'GET_REPORT_FAILED' });
    }
};
