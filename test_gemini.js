const { generateContent, MODELS } = require('./src/common/gemini');
require('dotenv').config({ override: true }); // Ensure it overrides session variables

async function test() {
    console.log('--- Testing Gemini Free Tier Compliance ---');
    console.log('Using Key starting with:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) : 'MISSING');
    
    try {
        console.log('1. Testing LITE model (Rate Limiting check)...');
        const start = Date.now();
        const res1 = await generateContent('Say "Lite Test"', { model: MODELS.LITE });
        console.log('Res 1:', res1);
        
        console.log('2. Testing CORE model (Rate Limiting check)...');
        const res2 = await generateContent('Say "Core Test"', { model: MODELS.CORE });
        console.log('Res 2:', res2);
        
        const end = Date.now();
        console.log(`Total time: ${end - start}ms (Should be > 5000ms due to throttle)`);
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

test();
