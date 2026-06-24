const { Pool } = require('pg');
require('dotenv').config({ path: 'c:/Users/hi/Downloads/toni-and-guy-salon-management/toni-and-guy-salon-management/backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const custs = await pool.query('SELECT id, name, phone, email, total_visits, total_spent FROM customers ORDER BY total_visits DESC');
    console.log('--- ALL CUSTOMERS ---');
    console.log(custs.rows);

    const appts = await pool.query('SELECT id, customer_id, status, appointment_date FROM appointments');
    console.log('--- ALL APPOINTMENTS ---');
    console.log(appts.rows);

    const bills = await pool.query('SELECT id, customer_id, total_amount, status, created_at FROM bills');
    console.log('--- ALL BILLS ---');
    console.log(bills.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
