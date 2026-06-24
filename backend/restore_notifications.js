const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { pool, testConnection } = require('./src/config/database');

async function run() {
  const dbPath = path.resolve(__dirname, 'database.sqlite');
  const db = new sqlite3.Database(dbPath);

  // 1. Fetch from SQLite
  const notifs = await new Promise((resolve, reject) => {
    db.all("SELECT * FROM notifications", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  console.log(`Read ${notifs.length} notifications from SQLite.`);

  // 2. Connect to PostgreSQL
  await testConnection();

  // Make sure notifications table exists in PG
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.log('Table might already exist or auto-migration handled it:', err.message);
  }

  // 3. Insert into PostgreSQL
  let count = 0;
  for (const notif of notifs) {
    try {
      // We set is_read = 0 to restore them as unread / visible
      await pool.execute(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)
         ON CONFLICT (id) DO UPDATE SET is_read = 0`,
        [notif.id, notif.user_id, notif.title, notif.message, notif.type, notif.created_at]
      );
      count++;
    } catch (err) {
      console.error(`Error inserting notification ${notif.id}:`, err.message);
    }
  }

  console.log(`Successfully restored ${count} notifications to PostgreSQL.`);
  db.close();
  process.exit(0);
}

run();
