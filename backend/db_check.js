const { pool, testConnection } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function run() {
  try {
    await testConnection();
    
    console.log('Resetting password for lakadaramkalyan@gmail.com to Admin@123456...');
    const hashedPassword = await bcrypt.hash('Admin@123456', 12);
    await pool.execute('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, 'lakadaramkalyan@gmail.com']);
    
    console.log('Password reset successfully!');
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
