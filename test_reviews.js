import 'dotenv/config';
import gbpClient from './utils/gbpClient.js';
import { normalizeReviews } from './utils/normalizeGBPResponse.js';

async function test() {
    try {
        console.log("Testing fetchReviews...");
        const rawData = await gbpClient.fetchReviews();
        if (rawData && rawData.error) {
            console.error("Error:", rawData);
            return;
        }
        console.log("Raw Data keys:", Object.keys(rawData));
        const normalized = normalizeReviews(rawData);
        console.log("Normalized Reviews (first 2):", JSON.stringify(normalized.reviews.slice(0, 2), null, 2));
        console.log("Total Count:", normalized.totalReviewCount);
    } catch (error) {
        console.error("Failed:", error.message);
    }
}
test();
