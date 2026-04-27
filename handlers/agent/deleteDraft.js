import { getDrafts, saveDrafts } from '../../utils/autonomousAgent.js';
import logger from '../../utils/logger.js';

export default async (req, res) => {
    const { draftId } = req.body;
    if (!draftId) {
        return res.status(400).json({ success: false, error: 'MISSING_DRAFT_ID' });
    }

    try {
        const drafts = await getDrafts();
        const nextDrafts = drafts.filter(d => d.id !== draftId);
        
        if (drafts.length === nextDrafts.length) {
            return res.status(404).json({ success: false, error: 'DRAFT_NOT_FOUND' });
        }

        await saveDrafts(nextDrafts);
        res.json({ success: true });
    } catch (error) {
        logger.error(`Failed to delete draft: ${error.message}`);
        res.status(500).json({ success: false, error: 'DELETE_DRAFT_FAILED' });
    }
};
