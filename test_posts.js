import 'dotenv/config';
import gbpClient from './utils/gbpClient.js';
import { normalizePosts } from './utils/normalizeGBPResponse.js';

async function test() {
    try {
        const rawData = await gbpClient.getPosts();
        if (rawData && rawData.error) {
            console.error("Error:", rawData);
            return;
        }
        const normalized = normalizePosts(rawData);
        console.log(JSON.stringify(normalized, null, 2));
    } catch (error) {
        console.error("Failed:", error.message);
    }
}
test();
