import * as autonomous from '../../utils/autonomousAgent.js';
import { getUpcomingTopics } from '../../utils/contentStrategy.js';
import logger from '../../utils/logger.js';

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
        res.status(500).json({ success: false, error: 'STATUS_FAILED', message: err.message });
    }
};
