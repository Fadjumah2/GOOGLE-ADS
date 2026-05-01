import { getDrafts } from '../../utils/autonomousAgent.js';
import logger from '../../utils/logger.js';
import sendError from '../../utils/error.js';

export default async (req, res) => {
    try {
        const drafts = await getDrafts();
        res.json({ success: true, drafts });
    } catch (error) {
        logger.error(`Failed to get drafts: ${error.message}`);
        sendError(res, 500, 'GET_DRAFTS_FAILED', error.message);
    }
};
