import * as autonomous from '../../utils/autonomousAgent.js';
import logger from '../../utils/logger.js';
import sendError from '../../utils/error.js';

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
        sendError(res, 500, 'AUTO_REPLY_FAILED', err.message);
    }
};
