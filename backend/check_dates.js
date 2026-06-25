const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const { rows: customers } = await pool.query('SELECT id, name, created_at FROM customers LIMIT 5');
  console.log('Customers:', customers);

  const { rows: bills } = await pool.query('SELECT id, customer_id, created_at FROM bills LIMIT 5');
  console.log('Bills:', bills);

  pool.end();
}

run();
