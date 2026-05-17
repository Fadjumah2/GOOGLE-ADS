import db from '../../../../utils/db.js';
import logger from '../../../../utils/logger.js';

// The 'learned_negatives' table is now handled by the main init_db.js
// We just expose query methods here to maintain the API.

export async function initDb() {
  logger.info('Ensuring learned_negatives table exists...');
  await db.query(`
    CREATE TABLE IF NOT EXISTS learned_negatives (
        id SERIAL PRIMARY KEY,
        keyword TEXT NOT NULL UNIQUE,
        campaign_id TEXT,
        ad_group_id TEXT,
        match_type TEXT NOT NULL,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  logger.info('Table "learned_negatives" ensured.');
}

export function closeDb() {
  // Postgres pool handles connections, no explicit close needed here
  logger.info('Postgres connection managed by pool.');
}

// Example replacement for getDb().db.run/db.all
// We use the unified db object directly in the agent now.
