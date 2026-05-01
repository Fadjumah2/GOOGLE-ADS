import { getDrafts, saveDrafts } from '../../utils/autonomousAgent.js';
import logger from '../../utils/logger.js';
import sendError from '../../utils/error.js';

export default async (req, res) => {
    const { draftId } = req.body;
    if (!draftId) {
        return sendError(res, 400, 'MISSING_DRAFT_ID', 'Missing draftId in request body.');
    }

    try {
        const drafts = await getDrafts();
        const nextDrafts = drafts.filter(d => d.id !== draftId);
        
        if (drafts.length === nextDrafts.length) {
            return sendError(res, 404, 'DRAFT_NOT_FOUND', 'Draft not found.');
        }

        await saveDrafts(nextDrafts);
        res.json({ success: true });
    } catch (error) {
        logger.error(`Failed to delete draft: ${error.message}`);
        sendError(res, 500, 'DELETE_DRAFT_FAILED', error.message);
    }
};
