const { Pool } = require('pg');
const logger = require('./logger'); // Assuming logger is available

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Vercel Postgres provides this env var
  ssl: {
    rejectUnauthorized: false // Required for some Vercel Postgres configurations
  }
});

pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => {
    return pool.query(text, params);
  },
  getClient: () => {
    return pool.connect();
  }
};
