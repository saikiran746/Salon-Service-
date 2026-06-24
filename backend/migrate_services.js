const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Adding gender column...');
    await client.query("ALTER TABLE services ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'Both'");
    
    console.log('Inserting new Hair services...');
    const servicesToInsert = [
      { name: 'Senior Stylist Haircut', gender: 'Male', duration: 30, price: 500 },
      { name: 'Creative Director Haircut', gender: 'Female', duration: 30, price: 1150 },
      { name: 'Kids Haircut', gender: 'Male', duration: 30, price: 300 },
      { name: 'Top Stylist Haircut', gender: 'Female', duration: 30, price: 850 },
      { name: 'Top Stylist Haircut (Male)', gender: 'Male', duration: 30, price: 650 }
    ];

    for (const svc of servicesToInsert) {
      // Check if it already exists to avoid duplicates
      const { rows } = await client.query('SELECT id FROM services WHERE name = $1 AND gender = $2', [svc.name, svc.gender]);
      if (rows.length === 0) {
        // Use exact name they asked for, even if it's the same name.
        const name = svc.name === 'Top Stylist Haircut (Male)' ? 'Top Stylist Haircut' : svc.name;
        const desc = 'Professional ' + name;
        await client.query(
          "INSERT INTO services (id, name, description, duration, price, specialist_type, category, sort_order, gender) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
          [uuidv4(), name, desc, svc.duration, svc.price, 'general', 'Hair', 0, svc.gender]
        );
        console.log('Inserted ' + name + ' (' + svc.gender + ')');
      } else {
        console.log('Service ' + svc.name + ' (' + svc.gender + ') already exists.');
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
