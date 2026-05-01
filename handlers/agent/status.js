import * as autonomous from '../../utils/autonomousAgent.js';
import { getUpcomingTopics } from '../../utils/contentStrategy.js';
import logger from '../../utils/logger.js';
import sendError from '../../utils/error.js';

/**
 * GET /api/agent/status
 * Snapshot of autonomous-agent state for the Autopilot UI panel.
 */
export default async (req, res) => {
    try {
        const status = await autonomous.getStatus();
        res.json({
            success: true,
            status,
            calendar: getUpcomingTopics(7),
        });
    } catch (err) {
        logger.error('agent status failed: ' + err.message);
        sendError(res, 500, 'STATUS_FAILED', err.message);
    }
};
