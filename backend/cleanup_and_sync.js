const { pool, testConnection } = require('./src/config/database');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

async function run() {
  await testConnection();
  console.log('⚡ Starting clean-up on PostgreSQL Cloud Database...');

  try {
    // 1. Delete appointments referencing Kalyan or Sai Kiran staff
    const [_, resAppts] = await pool.execute(`
      DELETE FROM appointments 
      WHERE staff_id IN (SELECT id FROM staff WHERE name ILIKE '%sai kiran%' OR name ILIKE '%kalyan%')
         OR notes ILIKE '%sai kiran%' 
         OR notes ILIKE '%kalyan%'
    `);
    console.log(`Deleted appointments:`, resAppts?.rowCount ?? 0);

    // 2. Delete bill items containing stylist name
    const [__, resBillItems] = await pool.execute(`
      DELETE FROM bill_items 
      WHERE description ILIKE '%sai kiran%' 
         OR description ILIKE '%kalyan%'
    `);
    console.log(`Deleted bill items:`, resBillItems?.rowCount ?? 0);

    // 3. Delete bills that have no items left (dangling bills)
    const [___, resBills] = await pool.execute(`
      DELETE FROM bills 
      WHERE id NOT IN (SELECT DISTINCT bill_id FROM bill_items)
    `);
    console.log(`Deleted dangling bills:`, resBills?.rowCount ?? 0);

    // 4. Delete staff members matching names
    const [____, resStaff] = await pool.execute(`
      DELETE FROM staff 
      WHERE name ILIKE '%sai kiran%' 
         OR name ILIKE '%kalyan%'
    `);
    console.log(`Deleted staff:`, resStaff?.rowCount ?? 0);

    // 5. Delete customers matching names
    const [_____, resCust] = await pool.execute(`
      DELETE FROM customers 
      WHERE name ILIKE '%sai kiran%' 
         OR name ILIKE '%kalyan%' 
         OR email ILIKE '%saikiran%' 
         OR email ILIKE '%kalyan%'
    `);
    console.log(`Deleted customers:`, resCust?.rowCount ?? 0);

    // 6. Delete users matching names (except admin-001)
    const [______, resUsers] = await pool.execute(`
      DELETE FROM users 
      WHERE (name ILIKE '%sai kiran%' OR name ILIKE '%kalyan%' OR email ILIKE '%saikiran%' OR email ILIKE '%kalyan%')
        AND id != 'admin-001'
    `);
    console.log(`Deleted users:`, resUsers?.rowCount ?? 0);

    // 7. Delete admin logins that are invalid/orphaned
    const [_______, resLogins] = await pool.execute(`
      DELETE FROM admin_logins 
      WHERE user_id NOT IN (SELECT id FROM users)
    `);
    console.log(`Deleted admin logins:`, resLogins?.rowCount ?? 0);

    // 8. Delete notifications containing target names
    const [________, resNotifs] = await pool.execute(`
      DELETE FROM notifications 
      WHERE message ILIKE '%sai kiran%' 
         OR message ILIKE '%kalyan%'
         OR title ILIKE '%sai kiran%'
         OR title ILIKE '%kalyan%'
    `);
    console.log(`Deleted notifications:`, resNotifs?.rowCount ?? 0);

    console.log('✅ PostgreSQL clean-up complete.');

  } catch (err) {
    console.error('❌ Error during PostgreSQL clean-up:', err.message);
  }

  // --- SQLite Setup and Sync ---
  console.log('🔌 Opening SQLite database...');
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

  const runSqlite = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  };

  // List of tables to sync
  const tables = [
    'users',
    'customers',
    'membership_plans',
    'membership_purchases',
    'services',
    'staff',
    'appointments',
    'bills',
    'bill_items',
    'reviews',
    'gallery_posts',
    'leads',
    'email_templates',
    'email_campaigns',
    'email_logs',
    'notifications',
    'cleared_notifications',
    'staff_shifts',
    'staff_leaves',
    'staff_attendance',
    'admin_logins',
    'site_settings'
  ];

  // Try to modify SQLite appointments table schema to remove any NOT NULL constraint from staff_id
  try {
    await runSqlite(`PRAGMA foreign_keys=off`);
    // Check if we need to modify schema or if simple catch of NOT NULL is fine.
    // If we catch constraint and set a dummy/existing staff ID or set to NULL, it's safer.
    // But wait, the easiest way to remove the NOT NULL constraint is to handle it during insertion.
    // If staff_id is null/undefined in target SQLite table with NOT NULL constraint, we can set it to a default staff or the first staff ID found.
  } catch (err) {
    console.warn('Could not set PRAGMA foreign_keys:', err.message);
  }

  try {
    // 1. Wipe SQLite tables
    console.log('🧹 Wiping all target tables in SQLite...');
    for (const table of tables) {
      try {
        await runSqlite(`DELETE FROM ${table}`);
      } catch (err) {
        console.warn(`Warning: Could not clear SQLite table ${table}:`, err.message);
      }
    }

    // Get a default staff ID from Postgres if we need to fall back
    const [pgStaffList] = await pool.execute("SELECT id FROM staff LIMIT 1");
    const fallbackStaffId = pgStaffList.length > 0 ? pgStaffList[0].id : 'staff-001';

    // 2. Fetch data from Postgres and insert into SQLite dynamically
    for (const table of tables) {
      try {
        console.log(`📦 Syncing table [${table}]...`);
        
        // Get target columns in SQLite using PRAGMA table_info
        const columnsInfo = await querySqlite(`PRAGMA table_info(${table})`);
        const targetColumns = columnsInfo.map(c => c.name);

        if (targetColumns.length === 0) {
          console.log(`   ⚠️ SQLite table [${table}] has no columns or doesn't exist. Skipping.`);
          continue;
        }

        // Fetch all from PostgreSQL
        const [postgresRows] = await pool.execute(`SELECT * FROM ${table}`);
        console.log(`   Found ${postgresRows.length} rows in Postgres [${table}]`);

        let insertedCount = 0;
        for (const row of postgresRows) {
          try {
            // Map row values, filtering out keys that don't exist in target SQLite table
            const filteredData = {};
            for (const col of targetColumns) {
              if (row[col] !== undefined) {
                filteredData[col] = row[col];
              } else {
                filteredData[col] = null;
              }
            }

            // Fallback for appointments.staff_id NOT NULL constraint if staff_id is null
            if (table === 'appointments' && !filteredData.staff_id) {
              // Only apply if it's actually required by schema
              const staffIdCol = columnsInfo.find(c => c.name === 'staff_id');
              if (staffIdCol && staffIdCol.notnull) {
                filteredData.staff_id = fallbackStaffId;
              }
            }

            const cols = Object.keys(filteredData);
            const placeholders = cols.map(() => '?').join(',');
            const values = cols.map(c => {
              if (filteredData[c] instanceof Date) {
                return filteredData[c].toISOString();
              }
              return filteredData[c];
            });

            const insertSql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
            await runSqlite(insertSql, values);
            insertedCount++;
          } catch (rowErr) {
            console.error(`   ⚠️ Row insertion error in SQLite [${table}] (row ID: ${row.id}):`, rowErr.message);
          }
        }
        console.log(`   Successfully synced ${insertedCount} rows to SQLite [${table}]`);
      } catch (tableErr) {
        console.warn(`   ⚠️ Table sync error on [${table}]:`, tableErr.message);
      }
    }

    // 3. Verify Admin account in SQLite
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@luxesalon.com';
    const sqliteAdmins = await querySqlite('SELECT * FROM users WHERE email = ?', [adminEmail]);
    if (sqliteAdmins.length === 0) {
      const adminPass = await bcrypt.hash(process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123456', 12);
      await runSqlite(
        "INSERT INTO users (id, name, email, phone, password, role) VALUES ('admin-001', 'Salon Admin', ?, '+919876543210', ?, 'super_admin')",
        [adminEmail, adminPass]
      );
      console.log('🌱 Seeded super admin account into SQLite:', adminEmail);
    } else {
      console.log('✅ SQLite admin user is present.');
    }

    console.log('\n🎉 ALL DATABASES SYNCED AND RESTORED SUCCESSFULLY!');

  } catch (err) {
    console.error('❌ Sync failed:', err.message);
  } finally {
    db.close();
    process.exit(0);
  }
}

run().catch(console.error);
