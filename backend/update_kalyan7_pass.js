const { pool, testConnection } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function run() {
  await testConnection();
  try {
    const email = 'lakadaramkalyan7@gmail.com';
    const password = 'kalyan456';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    await pool.execute(
      "UPDATE users SET password = ? WHERE email = ?",
      [hashedPassword, email]
    );
    console.log('Successfully updated password for lakadaramkalyan7@gmail.com to kalyan456');
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
