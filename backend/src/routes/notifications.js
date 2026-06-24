const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../config/database');
const { pool } = db;

router.get('/', authenticate, async (req, res, next) => {
  try {
    const [notifs] = await pool.execute(
      'SELECT * FROM notifications WHERE user_id = ? OR user_id = \'ADMIN\' ORDER BY created_at DESC', [req.user.id]
    );
    const [cleared] = await pool.execute(
      'SELECT COUNT(*) AS count FROM cleared_notifications WHERE user_id = ? OR user_id = \'ADMIN\'', [req.user.id]
    );
    res.json({ success: true, data: notifs, clearedCount: cleared[0]?.count || 0 });
  } catch (e) { next(e); }
});

router.delete('/clear-all', authenticate, async (req, res, next) => {
  try {
    await pool.execute(
      'INSERT INTO cleared_notifications (id, user_id, title, message, type, is_read, created_at) ' +
      'SELECT id, user_id, title, message, type, is_read, created_at FROM notifications ' +
      'WHERE user_id = ? OR user_id = \'ADMIN\'',
      [req.user.id]
    );
    await pool.execute(
      'DELETE FROM notifications WHERE user_id = ? OR user_id = \'ADMIN\'',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.patch('/restore-all', authenticate, async (req, res, next) => {
  try {
    const castCreatedAt = db.usePostgres ? 'CAST(created_at AS timestamp)' : 'created_at';
    await pool.execute(
      'INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) ' +
      `SELECT id, user_id, title, message, type, is_read, ${castCreatedAt} FROM cleared_notifications ` +
      'WHERE user_id = ? OR user_id = \'ADMIN\'',
      [req.user.id]
    );
    await pool.execute(
      'DELETE FROM cleared_notifications WHERE user_id = ? OR user_id = \'ADMIN\'',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    await pool.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    await pool.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id = \'ADMIN\'', [req.user.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
