const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('--- DETECTING DUPLICATES ---');
  const detectQuery = `
    SELECT name, COUNT(*), array_agg(id) as ids 
    FROM services 
    GROUP BY name 
    HAVING COUNT(*) > 1;
  `;
  const duplicates = await pool.query(detectQuery);
  console.log(duplicates.rows);

  console.log('\n--- REMOVING DUPLICATES ---');
  const deleteQuery = `
    DELETE FROM services
    WHERE id IN (
      SELECT id
      FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as rnum
        FROM services
      ) t
      WHERE t.rnum > 1
    );
  `;
  const deleteResult = await pool.query(deleteQuery);
  console.log(`Deleted ${deleteResult.rowCount} duplicate row(s).`);

  console.log('\n--- ADDING UNIQUE CONSTRAINT ---');
  try {
    const constraintQuery = `ALTER TABLE services ADD CONSTRAINT unique_service_name UNIQUE (name);`;
    await pool.query(constraintQuery);
    console.log('Unique constraint added successfully.');
  } catch (err) {
    if (err.code === '42710') {
      console.log('Constraint already exists.');
    } else {
      console.error('Error adding constraint:', err.message);
    }
  }

  pool.end();
}

run();
