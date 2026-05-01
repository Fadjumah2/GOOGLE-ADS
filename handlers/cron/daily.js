import { timingSafeEqual } from 'crypto';
import * as autonomous from '../../utils/autonomousAgent.js';
import * as auditLog from '../../utils/auditLog.js';
import logger from '../../utils/logger.js';
import sendError from '../../utils/error.js';

/**
 * GET /api/cron/daily
 *
 * Entry point for the Vercel Cron scheduler (see `crons` in vercel.json).
 * Vercel Cron automatically attaches an `Authorization: Bearer <CRON_SECRET>`
 * header when CRON_SECRET is set in the project's environment variables.
 * We verify that token before running any autonomous action — this keeps
 * the endpoint publicly reachable (Vercel Cron can't use x-api-key) while
 * still rejecting unauthorised callers.
 *
 * Behaviour on an UNAUTHORIZED call: returns 401 and records an audit
 * entry. Behaviour on a MISSING secret: fails closed (refuses to run)
 * so a misconfigured deployment can't be abused as a posting bot.
 */
export default async (req, res) => {
    const expected = process.env.CRON_SECRET;
    const provided = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();

    if (!expected) {
        auditLog.record('autopilot.cron.refused', { reason: 'cron_secret_missing' });
        return sendError(res, 503, 'CRON_SECRET_NOT_CONFIGURED', 'Set CRON_SECRET in the deployment env before enabling cron.');
    }
    const valid = provided &&
        provided.length === expected.length &&
        timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    if (!valid) {
        auditLog.record('autopilot.cron.unauthorized', {
            reason: provided ? 'bad_token' : 'missing_token',
            ua: req.headers['user-agent'] || null,
        });
        return sendError(res, 401, 'UNAUTHORIZED', 'Unauthorized');
    }

    try {
        const summary = await autonomous.runDailyCycle({ source: 'cron' });
        res.json({ success: true, summary });
    } catch (err) {
        logger.error('cron daily failed: ' + err.message);
        auditLog.record('autopilot.cron.error', { message: err.message });
        sendError(res, 500, 'CRON_RUN_FAILED', err.message);
    }
};
