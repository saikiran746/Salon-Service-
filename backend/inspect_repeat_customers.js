const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const resAll = await pool.query('SELECT id, name, phone, email, total_visits FROM customers');
    console.log('All customers:', resAll.rows);

    const resRepeat = await pool.query('SELECT COUNT(*) FROM customers WHERE total_visits > 1');
    console.log('Customers with total_visits > 1:', resRepeat.rows);

    const resApptGroup = await pool.query(`
      SELECT customer_id, COUNT(*) 
      FROM appointments 
      GROUP BY customer_id 
      HAVING COUNT(*) > 1
    `);
    console.log('Appointments per customer grouped (if > 1):', resApptGroup.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
