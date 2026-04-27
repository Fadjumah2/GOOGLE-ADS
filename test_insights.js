import 'dotenv/config';
import gbpClient from './utils/gbpClient.js';
import { normalizeInsights } from './utils/normalizeGBPResponse.js';

async function test() {
    try {
        console.log("Fetching raw insights data (Last 28 Days)...");
        const rawData = await gbpClient.getInsights();
        
        if (rawData && rawData.error) {
            console.error("Error:", JSON.stringify(rawData, null, 2));
            return;
        }
        
        if (rawData.multiDailyMetricTimeSeries && rawData.multiDailyMetricTimeSeries[0]) {
            console.log("Raw Insights Data (First Metric):", JSON.stringify(rawData.multiDailyMetricTimeSeries[0], null, 2));
        }
        
        console.log("\nNormalizing insights data...");
        const normalized = normalizeInsights(rawData);
        console.log("Normalized Insights Data Summary:", JSON.stringify(normalized, null, 2));
    } catch (error) {
        console.error("Failed:", error.message);
    }
}
test();
