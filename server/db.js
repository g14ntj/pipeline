const { Pool } = require('pg');

function useCloudSqlSocket() {
  const url = process.env.DATABASE_URL || '';
  return url.includes('/cloudsql/');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Cloud SQL unix sockets do not use TLS; only enable SSL for remote TCP connections.
  ssl:
    process.env.NODE_ENV === 'production' && !useCloudSqlSocket()
      ? { rejectUnauthorized: false }
      : false,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function getClient() {
  return pool.connect();
}

module.exports = { pool, query, getClient };
