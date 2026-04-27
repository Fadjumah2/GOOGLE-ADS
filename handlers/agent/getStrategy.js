import { getStrategy } from '../../utils/contentStrategy.js';
import logger from '../../utils/logger.js';

export default async (req, res) => {
    try {
        const strategy = await getStrategy();
        res.json({ success: true, strategy });
    } catch (error) {
        logger.error(`Failed to get strategy: ${error.message}`);
        res.status(500).json({ success: false, error: 'GET_STRATEGY_FAILED' });
    }
};
