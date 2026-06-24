const { pool, testConnection } = require('./src/config/database');

async function run() {
  await testConnection();
  try {
    const [users] = await pool.execute('SELECT id, name, email, role, is_active FROM users');
    console.log('--- ALL USERS IN DB ---');
    console.log(users);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
