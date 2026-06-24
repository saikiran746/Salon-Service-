const { testConnection, pool } = require('c:/Users/BK RAMADEVI/Desktop/latest salon/ToniAndGuy-SalonApp-Updated/backend/src/config/database');

async function check() {
  await testConnection();
  const [rows] = await pool.execute(`
    SELECT id, name, is_active, specializations 
    FROM staff
  `);
  console.log('--- ALL STAFF ---');
  console.log(rows);
}

check().catch(console.error);
