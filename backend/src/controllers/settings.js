const { pool } = require('../config/database');
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('../utils/email');

// In-memory cache for OTPs
const otpCache = new Map();

// Helper to generate a 6-digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Auto-migrate: add all required columns to site_settings if they don't exist
let migrated = false;
const ensureSettingsColumns = async () => {
  if (migrated) return;
  try {
    if (db.usePostgres) {
      const cols = [
        { name: 'gstin', type: 'TEXT' },
        { name: 'bank_name', type: 'TEXT' },
        { name: 'ifsc_code', type: 'TEXT' },
        { name: 'account_number', type: 'TEXT' },
        { name: 'closed_days', type: 'TEXT' },
        { name: 'closed_slots', type: 'TEXT' },
        { name: 'slot_interval', type: 'INTEGER DEFAULT 30' },
        { name: 'secondary_alert_email', type: 'TEXT' },
      ];
      for (const col of cols) {
        await pool.execute(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`).catch(() => {});
      }
    } else {
      // SQLite / MySQL: ALTER TABLE ADD COLUMN individually, ignore if exists
      const cols = [
        'gstin TEXT', 'bank_name TEXT', 'ifsc_code TEXT', 'account_number TEXT',
        'closed_days TEXT', 'closed_slots TEXT',
        'slot_interval INTEGER DEFAULT 30', 'secondary_alert_email TEXT'
      ];
      for (const col of cols) {
        await pool.execute(`ALTER TABLE site_settings ADD COLUMN ${col}`).catch(() => {});
      }
    }
    migrated = true;
    console.log('✅ site_settings columns ensured (slot_interval, secondary_alert_email)');
  } catch (err) {
    console.warn('Migration warning for site_settings columns:', err.message);
    migrated = true; // Don't retry on failure
  }
};

const getSettings = async (req, res, next) => {
  try {
    await ensureSettingsColumns();
    const [settings] = await pool.execute('SELECT * FROM site_settings LIMIT 1');
    if (settings.length === 0) {
      return res.json({
        success: true,
        data: {
          site_name: 'TONI & GUY ESSENSUALS HAIRDRESSING Kondapur',
          email: 'info@essensualskondapur.com',
          phone: '+91 98765 43210',
          address: 'Plot No. 45, Near Botanical Garden, Kondapur, Hyderabad, 500084',
          maps_link: '',
          whatsapp: '+919876543210',
          instagram: 'https://instagram.com/',
          facebook: 'https://facebook.com/',
          twitter: 'https://twitter.com/',
          working_hours: 'Mon–Sat: 9:00 AM – 8:00 PM\nSunday: 10:00 AM – 6:00 PM',
          gstin: '27AAAAA0000A1Z5',
          bank_name: 'Toni & Guy Partner Bank',
          ifsc_code: 'TGIB0002',
          account_number: '9876543210987',
          closed_days: '[]',
          closed_slots: '[]',
          slot_interval: 30,
          secondary_alert_email: '',
        }
      });
    }
    // Ensure slot_interval has a sensible default
    const row = settings[0];
    if (!row.slot_interval) row.slot_interval = 30;
    res.json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    await ensureSettingsColumns();
    const {
      site_name, email, phone, address, maps_link, whatsapp,
      instagram, facebook, twitter, working_hours,
      gstin, bank_name, ifsc_code, account_number,
      closed_days, closed_slots,
      slot_interval, secondary_alert_email
    } = req.body;

    const slotIntervalVal = parseInt(slot_interval, 10) || 30;

    const [existing] = await pool.execute('SELECT * FROM site_settings LIMIT 1');
    let invoiceInfoChanged = false;

    if (existing.length === 0) {
      invoiceInfoChanged = true;
      await pool.execute(
        `INSERT INTO site_settings (id, site_name, email, phone, address, maps_link, whatsapp, instagram, facebook, twitter, working_hours, gstin, bank_name, ifsc_code, account_number, closed_days, closed_slots, slot_interval, secondary_alert_email)
         VALUES ('settings-001', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [site_name, email, phone, address, maps_link, whatsapp, instagram, facebook, twitter, working_hours,
          gstin || '', bank_name || '', ifsc_code || '', account_number || '',
          closed_days || '[]', closed_slots || '[]',
          slotIntervalVal, secondary_alert_email || '']
      );
    } else {
      const old = existing[0];
      if (
        old.site_name !== site_name || old.email !== email || old.phone !== phone ||
        old.address !== address || old.gstin !== (gstin || '') ||
        old.bank_name !== (bank_name || '') || old.ifsc_code !== (ifsc_code || '') ||
        old.account_number !== (account_number || '')
      ) {
        invoiceInfoChanged = true;
      }
      const id = old.id;
      await pool.execute(
        `UPDATE site_settings SET
         site_name = ?, email = ?, phone = ?, address = ?, maps_link = ?,
         whatsapp = ?, instagram = ?, facebook = ?, twitter = ?, working_hours = ?,
         gstin = ?, bank_name = ?, ifsc_code = ?, account_number = ?,
         closed_days = ?, closed_slots = ?,
         slot_interval = ?, secondary_alert_email = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [site_name, email, phone, address, maps_link, whatsapp, instagram, facebook, twitter, working_hours,
          gstin || '', bank_name || '', ifsc_code || '', account_number || '',
          closed_days || '[]', closed_slots || '[]',
          slotIntervalVal, secondary_alert_email || '', id]
      );
    }

    if (invoiceInfoChanged) {
      // Clear cached invoice PDFs so they regenerate with updated settings
      try {
        const fs = require('fs');
        const path = require('path');
        const invoiceDir = path.join(process.cwd(), 'uploads', 'invoices');
        if (fs.existsSync(invoiceDir)) {
          const files = fs.readdirSync(invoiceDir);
          for (const file of files) {
            fs.unlinkSync(path.join(invoiceDir, file));
          }
          console.log(`🗑️ Cleared ${files.length} cached invoice PDFs after settings update`);
        }
        await pool.execute("UPDATE bills SET pdf_path = NULL");
      } catch (clearErr) {
        console.warn('Warning: Could not clear cached invoices:', clearErr.message);
      }
    }

    const [updated] = await pool.execute('SELECT * FROM site_settings LIMIT 1');
    res.json({ success: true, message: 'Settings updated successfully', data: updated[0] });
  } catch (error) {
    next(error);
  }
};

// Change admin credentials (email and/or password)
// Sends: 1) admin panel notification, 2) optional security alert to secondary_alert_email
const changeAdminCredentials = async (req, res, next) => {
  try {
    const { currentPassword, newEmail, newPassword, confirmPassword } = req.body;

    // Must provide at least one change
    if (!newEmail && !newPassword) {
      return res.status(400).json({ success: false, message: 'Provide a new email or new password to update.' });
    }

    if (newPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password do not match.' });
    }

    if (newPassword && newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    // Verify current password
    const [users] = await pool.execute(
      "SELECT id, name, email, password FROM users WHERE id = ? AND role IN ('admin', 'super_admin')",
      [req.user.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin user not found.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    // If changing email, check it's not already taken
    if (newEmail && newEmail !== user.email) {
      const [emailCheck] = await pool.execute('SELECT id FROM users WHERE email = ? AND id != ?', [newEmail, user.id]);
      if (emailCheck.length > 0) {
        return res.status(409).json({ success: false, message: 'That email address is already in use.' });
      }
    }

    // Build update fields
    const updates = [];
    const params = [];
    const changedFields = [];

    if (newEmail && newEmail !== user.email) {
      updates.push('email = ?');
      params.push(newEmail);
      changedFields.push('Email');
    }
    if (newPassword) {
      const hashed = await bcrypt.hash(newPassword, 12);
      updates.push('password = ?');
      params.push(hashed);
      changedFields.push('Password');
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No changes detected. New email is same as current.' });
    }

    params.push(user.id);
    await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const changedStr = changedFields.join(' & ');
    const nowStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // 1. Push notification to admin notification panel
    await pool.execute(
      'INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)',
      [
        uuidv4(),
        'ADMIN',
        '🔐 Admin Credentials Changed',
        `Admin ${changedStr} was updated by ${user.name} on ${nowStr}. If this was not you, please secure your account immediately.`,
        'security'
      ]
    );

    // 2. Send security alert to secondary_alert_email if configured
    // This uses the SAME SMTP transporter as all other emails — no new credentials
    try {
      await ensureSettingsColumns();
      const [settingsRow] = await pool.execute('SELECT secondary_alert_email FROM site_settings LIMIT 1');
      const secondaryEmail = settingsRow[0]?.secondary_alert_email?.trim();
      if (secondaryEmail) {
        // Generate a one-time magic login token (valid for 1 hour)
        // so "Secure Your Account" auto-logs in without asking for credentials
        await pool.execute(`
          CREATE TABLE IF NOT EXISTS admin_magic_tokens (
            id TEXT PRIMARY KEY,
            admin_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            used INTEGER DEFAULT 0,
            expires_at TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `).catch(() => {});

        const magicToken = uuidv4();
        const magicExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
        await pool.execute(
          'INSERT INTO admin_magic_tokens (id, admin_id, token, expires_at) VALUES (?, ?, ?, ?)',
          [uuidv4(), user.id, magicToken, magicExpiry]
        );

        const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
        const secureLink = `${frontendBase}/admin/secure-login?token=${magicToken}`;

        await sendEmail({
          to: secondaryEmail,
          subject: '⚠️ Admin Credentials Changed – TONI & GUY Salon',
          template: 'admin-credentials-changed',
          data: {
            changedFields: changedStr,
            adminName: user.name,
            adminEmail: newEmail || user.email,
            changedAt: nowStr,
            loginUrl: secureLink,
          },
        });
        console.log(`🔐 Security alert sent to secondary email: ${secondaryEmail}`);
      }
    } catch (emailErr) {
      // Non-fatal: log but don't fail the whole request
      console.error('Failed to send security alert email:', emailErr.message);
    }

    res.json({
      success: true,
      message: `Admin ${changedStr} updated successfully. A security notification has been logged.`,
    });
  } catch (error) {
    next(error);
  }
};

const requestEmailOtp = async (req, res, next) => {
  try {
    const { newEmail } = req.body;
    const [existing] = await pool.execute('SELECT secondary_alert_email FROM site_settings LIMIT 1');
    const oldEmail = existing[0]?.secondary_alert_email;

    if (!oldEmail) {
      return res.status(400).json({ success: false, message: 'No existing secondary email to send OTP to.' });
    }

    const otp = generateOtp();
    // Store OTP in cache with a 15-minute expiration
    otpCache.set(oldEmail, { otp, expiresAt: Date.now() + 15 * 60 * 1000 });

    const emailHtml = `
      <h2 style="color:#C9A84C;">Security Email Change Request</h2>
      <p>An attempt was made to change the secondary security alert email for your TONI & GUY salon system.</p>
      <p>If you requested this change, please use the following OTP to verify your identity:</p>
      <div style="background:#f9f5ef;border:2px dashed #C9A84C;padding:24px;text-align:center;font-size:36px;letter-spacing:12px;font-weight:bold;color:#0a0a0a;margin:32px 0;">
        ${otp}
      </div>
      <p style="color:#999;font-size:12px;">This code expires in 15 minutes. If you did not request this, please ignore this email.</p>
    `;

    await sendEmail({
      to: oldEmail,
      subject: 'OTP to Change Secondary Alert Email',
      html: emailHtml
    });

    res.json({ success: true, message: 'OTP sent to your existing secondary alert email.' });
  } catch (error) {
    next(error);
  }
};

const verifyEmailOtp = async (req, res, next) => {
  try {
    const { newEmail, otp } = req.body;
    const [existing] = await pool.execute('SELECT id, secondary_alert_email FROM site_settings LIMIT 1');
    const oldEmail = existing[0]?.secondary_alert_email;

    if (!oldEmail) {
      return res.status(400).json({ success: false, message: 'No existing secondary email to verify.' });
    }

    const cachedData = otpCache.get(oldEmail);
    if (!cachedData) {
      return res.status(400).json({ success: false, message: 'OTP expired or invalid.' });
    }

    if (Date.now() > cachedData.expiresAt) {
      otpCache.delete(oldEmail);
      return res.status(400).json({ success: false, message: 'OTP has expired.' });
    }

    if (cachedData.otp !== otp.toString()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }

    // OTP matches, update the secondary_alert_email directly
    otpCache.delete(oldEmail);
    const id = existing[0].id;
    await pool.execute(
      'UPDATE site_settings SET secondary_alert_email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newEmail || '', id]
    );

    res.json({ success: true, message: 'Secondary alert email updated successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSettings, updateSettings, changeAdminCredentials, requestEmailOtp, verifyEmailOtp };
