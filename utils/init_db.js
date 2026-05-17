import db from './db.js';
import logger from './logger.js';

const schema = `
CREATE TABLE IF NOT EXISTS campaign_configurations (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    campaign_id VARCHAR(255) NOT NULL,
    config_name VARCHAR(255) NOT NULL UNIQUE,
    bid_amount NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_runs (
    id SERIAL PRIMARY KEY,
    campaign_config_id INTEGER REFERENCES campaign_configurations(id) ON DELETE CASCADE,
    run_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roi_sentry_logs (
    id SERIAL PRIMARY KEY,
    agent_run_id INTEGER REFERENCES agent_runs(id) ON DELETE CASCADE,
    campaign_id VARCHAR(255) NOT NULL,
    budget_status VARCHAR(50),
    performance_metrics JSONB,
    action_taken TEXT,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS intent_surgeon_logs (
    id SERIAL PRIMARY KEY,
    agent_run_id INTEGER REFERENCES agent_runs(id) ON DELETE CASCADE,
    campaign_id VARCHAR(255) NOT NULL,
    search_term TEXT NOT NULL,
    identified_reason TEXT,
    status VARCHAR(50),
    injected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    negative_keyword_text TEXT
);

CREATE TABLE IF NOT EXISTS persuasion_architect_logs (
    id SERIAL PRIMARY KEY,
    agent_run_id INTEGER REFERENCES agent_runs(id) ON DELETE CASCADE,
    ad_group_id VARCHAR(255) NOT NULL,
    original_headline TEXT,
    new_headline TEXT,
    original_description TEXT,
    new_description TEXT,
    change_status VARCHAR(50),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    gemini_response JSONB
);

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value VARCHAR(50) NOT NULL
);

INSERT INTO system_settings (key, value) VALUES ('operational_mode', 'manual') ON CONFLICT (key) DO NOTHING;
`;

export default async function initializeDatabase() {
  logger.info('Initializing database schema...');
  try {
    await db.query(schema);
    logger.info('Database schema initialized successfully.');
  } catch (error) {
    logger.error('Error initializing database schema:', error);
    throw error;
  }
}
