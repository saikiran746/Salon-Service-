const { pool, testConnection } = require('./src/config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function run() {
  await testConnection();
  try {
    const email = 'pampanasairam9@gmail.com';
    const password = 'sairam123';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Check if user already exists
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      await pool.execute(
        "UPDATE users SET password = ?, role = 'customer', is_active = 1 WHERE email = ?",
        [hashedPassword, email]
      );
      console.log('Updated existing user to customer and reset password to sairam123');
    } else {
      const userId = uuidv4();
      const customerId = uuidv4();
      
      // Insert new user
      await pool.execute(
        "INSERT INTO users (id, name, email, phone, password, role, is_active) VALUES (?, 'Sairam Client', ?, '+919876543222', ?, 'customer', 1)",
        [userId, email, hashedPassword]
      );
      
      // Insert customer profile
      await pool.execute(
        "INSERT INTO customers (id, user_id, name, email, phone, source) VALUES (?, ?, 'Sairam Client', ?, '+919876543222', 'online')",
        [customerId, userId, email]
      );
      
      console.log('Inserted new customer user pampanasairam9@gmail.com and created their customer profile');
    }
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
