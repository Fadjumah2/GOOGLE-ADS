const axios = require('axios');
const logger = require('./logger');

const RATE_LIMIT_DELAY = 5000; // 5 seconds buffer to stay under 15 RPM
let lastRequestTime = 0;

/**
 * Throttling mechanism to ensure we don't exceed 15 RPM.
 */
async function throttle() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest;
    logger.info(`Gemini Rate Limiter: Throttling request. Waiting ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
}

/**
 * Centralized Gemini API caller.
 * @param {string} prompt - The prompt to send.
 * @param {Object} options - Options including model, temperature, responseMimeType, etc.
 * @returns {Promise<string>} - The response text.
 */
async function generateContent(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }

  // Tiered Intelligence Strategy:
  // - 'gemini-3-flash' for core reasoning/decisions (New "Pro" equivalent for free tier)
  // - 'gemini-3.1-flash-lite-preview' for simple tasks
  const model = options.model || 'gemini-3.1-flash-lite-preview';
  const temperature = options.temperature !== undefined ? options.temperature : 0.1;
  const responseMimeType = options.responseMimeType || 'text/plain';

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  await throttle();

  try {
    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        temperature,
        topP: 0.95,
        topK: 40,
        response_mime_type: responseMimeType,
      },
    };

    // Compact prompt: Ensure it's not empty and remove leading/trailing whitespace
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      throw new Error('Prompt cannot be empty.');
    }
    payload.contents[0].parts[0].text = cleanPrompt;

    logger.info(`Gemini API: Calling ${model} with temperature ${temperature}`);
    const response = await axios.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.data && response.data.candidates && response.data.candidates[0].content) {
      return response.data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Invalid response structure from Gemini API.');
    }
  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    logger.error(`Gemini API Error (${model}): ${errorMsg}`);
    throw new Error(`Gemini API call failed: ${errorMsg}`);
  }
}

module.exports = {
  generateContent,
  MODELS: {
    CORE: 'gemini-3-flash-preview',
    LITE: 'gemini-3.1-flash-lite-preview'
  }
};
