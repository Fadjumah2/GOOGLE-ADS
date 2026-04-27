import { getDrafts, saveDrafts } from '../../utils/autonomousAgent.js';
import * as gbpClient from '../../utils/gbpClient.js';
import * as auditLog from '../../utils/auditLog.js';
import logger from '../../utils/logger.js';

export default async (req, res) => {
    const { draftId } = req.body;
    if (!draftId) {
        return res.status(400).json({ success: false, error: 'MISSING_DRAFT_ID' });
    }

    try {
        const drafts = await getDrafts();
        const draftIndex = drafts.findIndex(d => d.id === draftId);
        
        if (draftIndex === -1) {
            return res.status(404).json({ success: false, error: 'DRAFT_NOT_FOUND' });
        }

        const draft = drafts[draftIndex];
        
        // Publish to GBP
        const result = await gbpClient.createPost(draft.payload);
        
        if (result && result.error) {
            return res.status(500).json(result);
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
        res.status(500).json({ success: false, error: 'APPROVE_DRAFT_FAILED' });
    }
};
