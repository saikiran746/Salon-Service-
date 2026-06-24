const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const { rows: cols } = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bill_items'`);
    console.log('bill_items columns:', cols);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
