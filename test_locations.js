import 'dotenv/config';
import gbpClient from './utils/gbpClient.js';

async function test() {
    try {
        console.log("Testing getLocations...");
        const data = await gbpClient.getLocations();
        if (data && data.error) {
            console.error("Error:", data);
            return;
        }
        console.log("Locations found:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Failed:", error.message);
    }
}
test();
