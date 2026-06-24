const { Pool } = require('pg');
require('dotenv').config({ path: 'c:/Users/hi/Downloads/toni-and-guy-salon-management/toni-and-guy-salon-management/backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const query = `
      WITH visit_counts AS (
        SELECT 
          CASE WHEN phone IS NOT NULL AND phone != '' THEN phone ELSE id END AS group_col,
          DATE(visit_date) AS visit_date
        FROM (
          SELECT customer_id, appointment_date AS visit_date FROM appointments WHERE status IN ('completed', 'confirmed')
          UNION
          SELECT customer_id, created_at AS visit_date FROM bills
        ) AS raw_visits
        JOIN customers ON raw_visits.customer_id = customers.id
      ),
      new_groups AS (
        SELECT group_col
        FROM visit_counts
        GROUP BY group_col
        HAVING COUNT(DISTINCT visit_date) = 1
      ),
      ranked_customers AS (
        SELECT 
          c.id,
          CASE WHEN c.phone IS NOT NULL AND c.phone != '' THEN c.phone ELSE c.id END AS group_col,
          ROW_NUMBER() OVER(
            PARTITION BY CASE WHEN c.phone IS NOT NULL AND c.phone != '' THEN c.phone ELSE c.id END
            ORDER BY c.total_visits DESC, c.created_at DESC
          ) as rn
        FROM customers c
        WHERE (c.phone IS NOT NULL AND c.phone != '') 
           OR (c.email IS NOT NULL AND c.email != '' AND c.email NOT LIKE '%@luxesalon.local')
      )
      SELECT c.* 
      FROM customers c
      JOIN ranked_customers rc ON c.id = rc.id
      WHERE rc.rn = 1 AND rc.group_col IN (SELECT group_col FROM new_groups)
    `;
    const res = await pool.query(query);
    console.log('--- NEW CLIENTS CTE QUERY RESULTS ---');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
