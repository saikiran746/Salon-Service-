const { pool, testConnection } = require('./src/config/database');

async function run() {
  await testConnection();
  try {
    const [bills] = await pool.execute('SELECT * FROM bills');
    console.log(`Found ${bills.length} bills in PostgreSQL:`);
    console.log(JSON.stringify(bills, null, 2));
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
