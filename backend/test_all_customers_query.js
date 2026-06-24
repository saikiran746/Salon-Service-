const { Pool } = require('pg');
require('dotenv').config({ path: 'c:/Users/hi/Downloads/toni-and-guy-salon-management/toni-and-guy-salon-management/backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const query = `
      SELECT c.*, mp.name AS membership_name, mp.discount AS membership_discount ,
        (SELECT COUNT(*) FROM appointments a WHERE a.customer_id = c.id AND a.status = 'completed') AS completed_appointments
      FROM customers c LEFT JOIN membership_plans mp ON c.membership_id = mp.id
      WHERE 1=1 AND c.created_at >= NOW() - INTERVAL '30 DAY' 
      ORDER BY c.created_at DESC 
      LIMIT 200 OFFSET 0
    `;
    const res = await pool.query(query, []);
    console.log('--- ALL CUSTOMERS QUERY RESULT ---');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
