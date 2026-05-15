const { Pool } = require('pg');
const logger = require('./logger'); // Assuming logger is available

const pool = new Pool({
  connectionString: (() => {
    let connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (connStr) {
      if (connStr.includes('?')) {
        connStr = connStr.includes('sslmode=') ? connStr.replace(/sslmode=[^&]+/, 'sslmode=verify-full') : connStr + '&sslmode=verify-full';
      } else {
        connStr += '?sslmode=verify-full';
      }
    }
    return connStr;
  })(),
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
