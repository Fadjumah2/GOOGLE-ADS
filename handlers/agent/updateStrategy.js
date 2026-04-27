import { updateStrategy } from '../../utils/contentStrategy.js';
import logger from '../../utils/logger.js';

export default async (req, res) => {
    const { strategy } = req.body;
    if (!strategy) {
        return res.status(400).json({ success: false, error: 'MISSING_STRATEGY' });
    }

    try {
        const result = await updateStrategy(strategy);
        res.json(result);
    } catch (error) {
        logger.error(`Failed to update strategy: ${error.message}`);
        res.status(500).json({ success: false, error: 'UPDATE_STRATEGY_FAILED' });
    }
};
