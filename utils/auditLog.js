import storage from './storage.js';
import logger from './logger.js';

const MAX_ENTRIES = 500;
const LOG_FILE = 'synapse-audit.json';

let ring = [];
let loaded = false;

async function ensureLoaded() {
    if (loaded) return;
    try {
        const data = await storage.load(LOG_FILE);
        if (data && Array.isArray(data)) {
            ring = data;
        }
        loaded = true;
    } catch (e) {
        logger.error('Failed to load audit log from GCS: ' + e.message);
        ring = [];
        loaded = true;
    }
}

/**
 * Record an audit event. Non-blocking — failures don't throw.
 */
export async function record(type, payload = {}) {
    await ensureLoaded();
    const entry = {
        ts: new Date().toISOString(),
        type,
        payload: sanitize(payload),
    };
    ring.push(entry);
    while (ring.length > MAX_ENTRIES) ring.shift();

    // Background save to GCS
    storage.save(LOG_FILE, ring).catch(e => {
        logger.error('Background audit save failed: ' + e.message);
    });

    return entry;
}

/**
 * Strip obviously-sensitive fields before persisting.
 */
function sanitize(obj) {
    if (obj == null || typeof obj !== 'object') return obj;
    const out = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
        const lk = k.toLowerCase();
        if (lk.includes('token') || lk.includes('secret') || lk.includes('apikey') || lk.includes('authorization')) {
            out[k] = '[REDACTED]';
        } else if (typeof v === 'object') {
            out[k] = sanitize(v);
        } else {
            out[k] = v;
        }
    }
    return out;
}

/**
 * Return the most recent N entries, newest last (chronological).
 * Optional filter by type prefix.
 */
export function recent(limit = 100, typePrefix = null) {
    const filtered = typePrefix
        ? ring.filter(e => e.type.startsWith(typePrefix))
        : ring.slice();
    return filtered.slice(-limit);
}

/**
 * Returns the most recent entry matching the given type, or null.
 */
export function findLast(type) {
    for (let i = ring.length - 1; i >= 0; i--) {
        if (ring[i].type === type) return ring[i];
    }
    return null;
}

export const _ring = ring;
