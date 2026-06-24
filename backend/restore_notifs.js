require('dotenv').config();
const { pool } = require('./src/config/database');

async function restoreNotifs() {
  try {
    // 1. Delete all current notifications completely
    await pool.execute('DELETE FROM notifications');
    console.log('Current notifications deleted.');

    // 2. Restore from cleared_notifications
    const castCreatedAt = pool.config?.connectionConfig?.client === 'pg' ? 'CAST(created_at AS timestamp)' : 'created_at';
    
    // We will just restore everything from cleared_notifications
    await pool.execute(
      'INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) ' +
      `SELECT id, user_id, title, message, type, is_read, created_at FROM cleared_notifications`
    );
    console.log('Old notifications restored.');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

restoreNotifs();
