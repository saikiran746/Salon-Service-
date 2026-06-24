const { pool } = require('../config/database');

// Ensures the table exists
const ensureTableExists = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS whatsapp_settings (
        id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 0,
        delay INTEGER DEFAULT 3000,
        template TEXT DEFAULT 'Hello {customer_name}, here is your invoice {invoice_number} for amount {total_amount}. View it here: {invoice_link}',
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if default record exists
    const [rows] = await pool.execute("SELECT id FROM whatsapp_settings WHERE id = 'default'");
    if (rows.length === 0) {
      await pool.execute(
        'INSERT INTO whatsapp_settings (id, enabled, delay, template) VALUES (?, ?, ?, ?)',
        ['default', 0, 3000, 'Hello {customer_name}, here is your invoice {invoice_number} for amount {total_amount}. View it here: {invoice_link}']
      );
    }
  } catch (err) {
    console.error('Error ensuring whatsapp_settings table exists:', err);
  }
};

const getSettings = async (req, res, next) => {
  try {
    await ensureTableExists();
    const [rows] = await pool.execute("SELECT * FROM whatsapp_settings WHERE id = 'default'");
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    await ensureTableExists();
    const { enabled, delay, template } = req.body;
    await pool.execute(
      `UPDATE whatsapp_settings SET enabled = ?, delay = ?, template = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'default'`,
      [enabled ? 1 : 0, parseInt(delay) || 3000, template || '']
    );
    const [rows] = await pool.execute("SELECT * FROM whatsapp_settings WHERE id = 'default'");
    res.json({ success: true, message: 'WhatsApp settings updated successfully', data: rows[0] });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings
};
