import { getStrategy } from '../../utils/contentStrategy.js';
import logger from '../../utils/logger.js';
import sendError from '../../utils/error.js';

export default async (req, res) => {
    try {
        const strategy = await getStrategy();
        res.json({ success: true, strategy });
    } catch (error) {
        logger.error(`Failed to get strategy: ${error.message}`);
        sendError(res, 500, 'GET_STRATEGY_FAILED', error.message);
    }
};
