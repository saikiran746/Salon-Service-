const { pool, testConnection } = require('./src/config/database');

async function update() {
  await testConnection();
  try {
    await pool.execute('UPDATE bills SET created_at = NOW(), updated_at = NOW()');
    console.log("Updated all bills to today's date.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

update();
