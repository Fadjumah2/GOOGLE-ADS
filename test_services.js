import 'dotenv/config';
import gbpClient from './utils/gbpClient.js';
import { normalizeServices } from './utils/normalizeGBPResponse.js';

async function testServices() {
    try {
        console.log("Testing getServiceList...");
        const rawData = await gbpClient.getServiceList();
        if (rawData && rawData.error) {
            console.error("Error fetching service list:", JSON.stringify(rawData, null, 2));
            return;
        }
        console.log("Raw Service List keys:", Object.keys(rawData));
        const normalized = normalizeServices(rawData);
        console.log("Normalized Services:", JSON.stringify(normalized, null, 2));
    } catch (error) {
        console.error("Failed:", error.message);
    }
}

testServices();
