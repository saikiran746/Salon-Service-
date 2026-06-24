const { pool, testConnection } = require('./src/config/database');

async function check() {
  await testConnection();
  try {
    const [bills] = await pool.execute('SELECT id, invoice_number, created_at FROM bills');
    console.log(`Found ${bills.length} bills in PostgreSQL.`);
    bills.forEach(b => {
      console.log(`Bill: ${b.id}, Invoice: ${b.invoice_number}, Date: ${b.created_at}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
