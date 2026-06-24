const { pool, testConnection } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function run() {
  await testConnection();
  try {
    const email = 'admin@luxesalon.com';
    const [rows] = await pool.execute('SELECT id, name, email, password FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      console.log(`Admin user ${email} not found in DB!`);
      // Create admin user
      const password = 'Admin@123456';
      const hashedPassword = await bcrypt.hash(password, 12);
      await pool.execute(
        "INSERT INTO users (id, name, email, phone, password, role) VALUES ('admin-001', 'Salon Admin', ?, '+919876543210', ?, 'super_admin')",
        [email, hashedPassword]
      );
      console.log('Successfully created admin user with password: Admin@123456');
    } else {
      const user = rows[0];
      console.log('Found admin user in DB:', { id: user.id, email: user.email, name: user.name });
      const isMatch = await bcrypt.compare('Admin@123456', user.password);
      console.log('Does current password in DB match "Admin@123456"?', isMatch);
      
      if (!isMatch) {
        console.log('Resetting password for admin...');
        const hashedPassword = await bcrypt.hash('Admin@123456', 12);
        await pool.execute(
          "UPDATE users SET password = ? WHERE id = ?",
          [hashedPassword, user.id]
        );
        console.log('Successfully reset admin password to: Admin@123456');
      }
    }
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
