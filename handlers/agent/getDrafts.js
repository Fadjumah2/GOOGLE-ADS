import { getDrafts } from '../../utils/autonomousAgent.js';
import logger from '../../utils/logger.js';

export default async (req, res) => {
    try {
        const drafts = await getDrafts();
        res.json({ success: true, drafts });
    } catch (error) {
        logger.error(`Failed to get drafts: ${error.message}`);
        res.status(500).json({ success: false, error: 'GET_DRAFTS_FAILED' });
    }
};
