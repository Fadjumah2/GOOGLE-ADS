import { fetchReviews } from '../../utils/gbpClient.js';
import { normalizeReviews } from '../../utils/normalizeGBPResponse.js';
import { generateText } from '../../utils/geminiClient.js';
import logger from '../../utils/logger.js';

export default async (req, res) => {
    try {
        const rawReviews = await fetchReviews();
        const { reviews = [] } = normalizeReviews(rawReviews);

        if (reviews.length === 0) {
            return res.json({ success: true, sentiment: null });
        }

        // Only analyze recent reviews with text
        const textReviews = reviews
            .filter(r => r.comment)
            .sort((a, b) => Date.parse(b.createTime) - Date.parse(a.createTime))
            .slice(0, 15);

        if (textReviews.length === 0) {
            return res.json({ success: true, sentiment: null });
        }

        const reviewsBlob = textReviews.map(r => `Rating: ${r.starRating}, Comment: "${r.comment}"`).join('\n---\n');

        const prompt = `
You are an expert patient experience analyst for Eritage ENT Care.
Analyze the following recent customer reviews and provide a structured sentiment report.

REVIEWS:
${reviewsBlob}

TASK:
1. Provide an overall sentiment score (0-100).
2. List the Top 3 "Patient Praises" (what people love).
3. List the Top 2 "Actionable Complaints" (what needs work).
4. Extract 2-3 specific "Clinic Facts" mentioned in positive reviews that could be added to our knowledge base (e.g. "Open on Saturdays", "Doctor explains things clearly").

FORMAT: Output ONLY a JSON object with this structure:
{
  "score": 85,
  "praises": ["...", "...", "..."],
  "complaints": ["...", "..."],
  "facts": ["...", "..."],
  "summary": "Short 1-sentence summary of patient mood."
}
`;

        const responseText = await generateText(prompt, { temperature: 0.3 });
        let sentiment;
        try {
            sentiment = JSON.parse(responseText);
        } catch (e) {
            // Fallback if AI output isn't clean JSON
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            sentiment = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }

        res.json({ success: true, sentiment });
    } catch (error) {
        logger.error(`Failed to get sentiment: ${error.message}`);
        res.status(500).json({ success: false, error: 'GET_SENTIMENT_FAILED' });
    }
};
