const { pool, testConnection } = require('./src/config/database');

async function run() {
  await testConnection();
  try {
    const [staff] = await pool.execute('SELECT id, name, is_active FROM staff');
    console.log('--- POSTGRES STAFF ---');
    console.log(staff);

    const [users] = await pool.execute("SELECT id, name, email, role FROM users WHERE name ILIKE '%sai kiran%' OR name ILIKE '%kalyan%'");
    console.log('--- POSTGRES USERS matching sai kiran / kalyan ---');
    console.log(users);

    const [bills] = await pool.execute('SELECT COUNT(*) as count FROM bills');
    console.log('Total bills in Postgres:', bills[0].count);

    const [billItems] = await pool.execute("SELECT DISTINCT description FROM bill_items WHERE description ILIKE '%sai kiran%' OR description ILIKE '%kalyan%'");
    console.log('Bill items containing sai kiran or kalyan:', billItems);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
