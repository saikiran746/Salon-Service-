const { pool, testConnection } = require('./src/config/database');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function run() {
  await testConnection();
  console.log('--- POSTGRESQL INSPECTION ---');
  try {
    // 1. Staff matching Kalyan or Sai Kiran
    const [staff] = await pool.execute("SELECT * FROM staff WHERE name ILIKE '%sai kiran%' OR name ILIKE '%kalyan%'");
    console.log('Postgres Staff:', staff);

    // 2. Users/Customers matching Kalyan or Sai Kiran
    const [users] = await pool.execute("SELECT * FROM users WHERE name ILIKE '%sai kiran%' OR name ILIKE '%kalyan%' OR email ILIKE '%saikiran%' OR email ILIKE '%kalyan%'");
    console.log('Postgres Users:', users);

    // 3. Appointments referencing those staff ids
    const staffIds = staff.map(s => s.id);
    if (staffIds.length > 0) {
      const placeholders = staffIds.map(() => '?').join(',');
      const [appts] = await pool.execute(`SELECT * FROM appointments WHERE staff_id IN (${placeholders})`, staffIds);
      console.log('Postgres Appointments by Staff ID:', appts);
    } else {
      console.log('No Postgres staff found for these names.');
    }

    // 4. Bill items containing stylist name
    const [billItems] = await pool.execute("SELECT * FROM bill_items WHERE description ILIKE '%sai kiran%' OR description ILIKE '%kalyan%'");
    console.log('Postgres Bill Items matching names:', billItems);

    if (billItems.length > 0) {
      const billIds = billItems.map(item => item.bill_id);
      const placeholders = billIds.map(() => '?').join(',');
      const [bills] = await pool.execute(`SELECT * FROM bills WHERE id IN (${placeholders})`, billIds);
      console.log('Postgres Bills for these items:', bills);
    }
  } catch (err) {
    console.error('Postgres error:', err);
  }

  console.log('\n--- SQLITE INSPECTION ---');
  const dbPath = path.resolve(__dirname, 'database.sqlite');
  const db = new sqlite3.Database(dbPath);
  
  const querySqlite = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  try {
    const sqliteStaff = await querySqlite("SELECT * FROM staff WHERE name LIKE '%sai kiran%' OR name LIKE '%kalyan%'");
    console.log('SQLite Staff:', sqliteStaff);

    const sqliteUsers = await querySqlite("SELECT * FROM users WHERE name LIKE '%sai kiran%' OR name LIKE '%kalyan%' OR email LIKE '%saikiran%' OR email LIKE '%kalyan%'");
    console.log('SQLite Users:', sqliteUsers);

    const staffIds = sqliteStaff.map(s => s.id);
    if (staffIds.length > 0) {
      const placeholders = staffIds.map(() => '?').join(',');
      const sqliteAppts = await querySqlite(`SELECT * FROM appointments WHERE staff_id IN (${placeholders})`, staffIds);
      console.log('SQLite Appointments by Staff ID:', sqliteAppts);
    } else {
      console.log('No SQLite staff found for these names.');
    }

    const sqliteBillItems = await querySqlite("SELECT * FROM bill_items WHERE description LIKE '%sai kiran%' OR description LIKE '%kalyan%'");
    console.log('SQLite Bill Items matching names:', sqliteBillItems);

    if (sqliteBillItems.length > 0) {
      const billIds = sqliteBillItems.map(item => item.bill_id);
      const placeholders = billIds.map(() => '?').join(',');
      const sqliteBills = await querySqlite(`SELECT * FROM bills WHERE id IN (${placeholders})`, billIds);
      console.log('SQLite Bills for these items:', sqliteBills);
    }
  } catch (err) {
    console.error('SQLite error:', err);
  } finally {
    db.close();
  }
  process.exit(0);
}

run();
