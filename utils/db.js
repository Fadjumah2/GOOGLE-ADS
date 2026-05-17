import pkg from 'pg';
const { Pool } = pkg;
import logger from './logger.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default {
  query: (text, params) => {
    return pool.query(text, params);
  },
  getClient: () => {
    return pool.connect();
  }
};
