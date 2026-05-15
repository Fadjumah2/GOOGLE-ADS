const db = require('./db');
const logger = require('./logger');

const schema = `
CREATE TABLE IF NOT EXISTS campaign_configurations (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    campaign_id VARCHAR(255) NOT NULL,
    config_name VARCHAR(255) NOT NULL UNIQUE,
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

-- Add a trigger to update updated_at column automatically
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON campaign_configurations
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();
`;

async function initializeDatabase() {
  logger.info('Initializing database schema...');
  try {
    await db.query(schema);
    logger.info('Database schema initialized successfully.');
  } catch (error) {
    logger.error('Error initializing database schema:', error);
    throw error;
  }
}

// If this script is run directly, initialize the database
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
