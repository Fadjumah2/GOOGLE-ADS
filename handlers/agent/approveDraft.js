import { getDrafts, saveDrafts } from '../../utils/autonomousAgent.js';
import * as auditLog from '../../utils/auditLog.js';
import logger from '../../utils/logger.js';
import sendError from '../../utils/error.js';

export default async (req, res) => {
    const { draftId } = req.body;
    if (!draftId) {
        return sendError(res, 400, 'MISSING_DRAFT_ID', 'Missing draftId in request body.');
    }

    try {
        const drafts = await getDrafts();
        const draftIndex = drafts.findIndex(d => d.id === draftId);
        
        if (draftIndex === -1) {
            return sendError(res, 404, 'DRAFT_NOT_FOUND', 'Draft not found.');
        }

        const draft = drafts[draftIndex];
        
        // Publish to GBP
        const result = await req.gbp.createPost(draft.payload);
        
        if (result && result.error) {
            return sendError(res, 500, result.error, result.message);
        }

        // Remove from drafts
        drafts.splice(draftIndex, 1);
        await saveDrafts(drafts);

        auditLog.record('autopilot.post.published', { 
            published: true, 
            postName: result?.name, 
            summary: draft.payload.summary,
            source: 'draft_approval'
        });

        res.json({ success: true, post: result });
    } catch (error) {
        logger.error(`Failed to approve draft: ${error.message}`);
        sendError(res, 500, 'APPROVE_DRAFT_FAILED', error.message);
    }
};
