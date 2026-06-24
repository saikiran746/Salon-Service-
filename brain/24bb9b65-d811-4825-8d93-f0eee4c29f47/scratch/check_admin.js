const { testConnection, pool } = require('c:/Users/BK RAMADEVI/Desktop/latest salon/ToniAndGuy-SalonApp-Updated/backend/src/config/database');

async function check() {
  await testConnection();
  const [rows] = await pool.execute("SELECT id, name, email, password, role, is_active FROM users WHERE email = 'admin@luxesalon.com'");
  console.log('--- ADMIN USER ---');
  console.log(rows);
}

check().catch(console.error);
