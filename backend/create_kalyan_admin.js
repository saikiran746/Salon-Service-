const { pool, testConnection } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function run() {
  await testConnection();
  try {
    const email = 'lakadaramkalyan@gmail.com';
    const password = 'Admin@123456';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Check if user already exists
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      // Update password and ensure role is super_admin
      await pool.execute(
        "UPDATE users SET password = ?, role = 'super_admin', is_active = 1 WHERE email = ?",
        [hashedPassword, email]
      );
      console.log('Updated existing user to super_admin and set password');
    } else {
      // Insert new super admin
      await pool.execute(
        "INSERT INTO users (id, name, email, phone, password, role, is_active) VALUES (?, 'Kalyan Admin', ?, '+919876543210', ?, 'super_admin', 1)",
        ['admin-kalyan', email, hashedPassword]
      );
      console.log('Inserted new super_admin user');
    }
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
