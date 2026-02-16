const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not defined in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  console.log('🟢 PostgreSQL connected');
});

pool.on('error', (err) => {
  if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    console.error('❌ Database unreachable (check internet and Supabase):', err.message);
  } else {
    console.error('❌ DB pool error:', err.message);
  }
});

const url = process.env.DATABASE_URL || '';
const safeUrl = url.replace(/:[^:@]+@/, ':****@');
console.log('DATABASE_URL:', safeUrl);

module.exports = pool;
