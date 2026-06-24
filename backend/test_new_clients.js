const { Pool } = require('pg');
require('dotenv').config({ path: 'c:/Users/hi/Downloads/toni-and-guy-salon-management/toni-and-guy-salon-management/backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const query = `
      SELECT c.* 
      FROM customers c 
      WHERE c.created_at >= NOW() - INTERVAL '30 DAY'
    `;
    const res = await pool.query(query);
    console.log('--- NEW CLIENTS QUERY RESULT ---');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
