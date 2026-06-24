const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    // 1. Add customer_gender column to bills table if not exists
    await client.query(`
      ALTER TABLE bills ADD COLUMN IF NOT EXISTS customer_gender TEXT;
    `);
    console.log('✓ Added customer_gender column to bills table');

    // 2. Check current customers gender data
    const { rows: customers } = await client.query('SELECT id, name, phone, gender FROM customers');
    console.log('\nCustomers:', JSON.stringify(customers, null, 2));

    // 3. Check bills
    const { rows: bills } = await client.query('SELECT id, customer_gender, appointment_id, customer_id FROM bills LIMIT 10');
    console.log('\nBills:', JSON.stringify(bills, null, 2));

    // 4. Clear all gender values in customers table - so nothing defaults to female
    // Gender should only be set during billing, not carried over
    await client.query(`UPDATE customers SET gender = NULL WHERE gender IS NOT NULL`);
    console.log('\n✓ Cleared all customer profile genders (will be set per-bill going forward)');

    // 5. Verify
    const { rows: updatedCustomers } = await client.query('SELECT id, name, phone, gender FROM customers');
    console.log('\nUpdated customers:', JSON.stringify(updatedCustomers, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
