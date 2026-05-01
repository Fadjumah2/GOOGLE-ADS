import * as autonomous from '../../utils/autonomousAgent.js';
import logger from '../../utils/logger.js';
import sendError from '../../utils/error.js';

/**
 * POST /api/agent/autonomousPost
 * Optional body: { force?: boolean, dryRun?: boolean }
 *
 * Manually trigger the daily-post job. Idempotent: if a post already went
 * live today, returns a "skipped" report unless force=true.
 */
export default async (req, res) => {
    try {
        const { force, dryRun } = req.body || {};
        const report = await autonomous.runDailyPost({
            force: !!force,
            dryRun: dryRun === true ? true : null,
        });
        res.json({ success: true, report });
    } catch (err) {
        logger.error('autonomousPost failed: ' + err.message);
        sendError(res, 500, 'AUTONOMOUS_POST_FAILED', err.message);
    }
};
