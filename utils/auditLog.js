import fs from 'fs';
import path from 'path';

const MAX_ENTRIES = 500;
const LOG_PATH = process.env.SYNAPSE_AUDIT_PATH || path.join('/tmp', 'synapse-audit.jsonl');

const ring = [];
let fileWritable = true;

function loadFromDisk() {
    try {
        if (!fs.existsSync(LOG_PATH)) return;
        const raw = fs.readFileSync(LOG_PATH, 'utf8');
        raw.split('
').forEach(line => {
            if (!line.trim()) return;
            try {
                const entry = JSON.parse(line);
                ring.push(entry);
            } catch { /* corrupt line, skip */ }
        });
        while (ring.length > MAX_ENTRIES) ring.shift();
    } catch (e) {
        fileWritable = false;
    }
}

loadFromDisk();

/**
 * Record an audit event. Non-blocking — failures don't throw.
 */
export function record(type, payload = {}) {
    const entry = {
        ts: new Date().toISOString(),
        type,
        payload: sanitize(payload),
    };
    ring.push(entry);
    while (ring.length > MAX_ENTRIES) ring.shift();

    if (fileWritable) {
        try {
            fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '
');
        } catch {
            fileWritable = false;
        }
    }
    return entry;
}

/**
 * Strip obviously-sensitive fields before persisting.
 * Customer review text is kept (it's already public on Google) but
 * anything that looks like a token or key is removed.
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
