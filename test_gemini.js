const axios = require('axios');
require('dotenv').config();

async function test() {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = 'gemini-3.1-pro-preview';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
        const response = await axios.post(endpoint, {
            contents: [{ parts: [{ text: 'Hello' }] }],
        }, {
            headers: { 'Content-Type': 'application/json' },
        });
        console.log('Success:', response.data.candidates[0].content.parts[0].text);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}
test();
