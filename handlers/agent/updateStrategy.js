import { updateStrategy } from '../../utils/contentStrategy.js';
import logger from '../../utils/logger.js';
import sendError from '../../utils/error.js';

export default async (req, res) => {
    const { strategy } = req.body;
    if (!strategy) {
        return sendError(res, 400, 'MISSING_STRATEGY', 'Missing strategy in request body.');
    }

    try {
        const result = await updateStrategy(strategy);
        res.json(result);
    } catch (error) {
        logger.error(`Failed to update strategy: ${error.message}`);
        sendError(res, 500, 'UPDATE_STRATEGY_FAILED', error.message);
    }
};
