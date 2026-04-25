import * as autonomous from '../../utils/autonomousAgent.js';
import logger from '../../utils/logger.js';

/**
 * POST /api/agent/runDaily
 * Run the full autonomous daily cycle (post + replies) immediately.
 */
export default async (req, res) => {
    try {
        const summary = await autonomous.runDailyCycle({
            source: 'manual',
            force: !!(req.body && req.body.force),
        });
        res.json({ success: true, summary });
    } catch (err) {
        logger.error('runDaily failed: ' + err.message);
        res.status(500).json({ success: false, error: 'DAILY_CYCLE_FAILED', message: err.message });
    }
};
