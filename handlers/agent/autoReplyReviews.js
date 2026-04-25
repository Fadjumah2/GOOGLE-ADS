import * as autonomous from '../../utils/autonomousAgent.js';
import logger from '../../utils/logger.js';

/**
 * POST /api/agent/autoReplyReviews
 * Optional body: { maxReplies?: number, dryRun?: boolean }
 *
 * Drafts and publishes replies to safe (4★/5★, unanswered) reviews.
 */
export default async (req, res) => {
    try {
        const { maxReplies, dryRun } = req.body || {};
        const report = await autonomous.runAutoReplies({
            maxReplies: Number.isFinite(maxReplies) ? maxReplies : 5,
            dryRun: dryRun === true ? true : null,
        });
        res.json({ success: true, report });
    } catch (err) {
        logger.error('autoReplyReviews failed: ' + err.message);
        res.status(500).json({ success: false, error: 'AUTO_REPLY_FAILED', message: err.message });
    }
};
