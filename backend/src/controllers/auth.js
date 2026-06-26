const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { google } = require('googleapis');
const { sendEmail } = require('../utils/email');
const { z } = require('zod');
const sanitizeHtml = require('sanitize-html');

const sanitizeStr = (str) => {
  if (!str) return '';
  return sanitizeHtml(str, {
    allowedTags: [],
    allowedAttributes: {}
  }).replace(/[<>]/g, '').trim();
};

const registerSchema = z.object({
  name: z.string().min(2).max(50).transform(sanitizeStr),
  email: z.string().email().max(100).transform(sanitizeStr),
  phone: z.string().min(10).max(15).transform(sanitizeStr).optional(),
  password: z.string().min(8).max(100),
  gender: z.string().max(20).transform(sanitizeStr).optional()
});

const loginSchema = z.object({
  email: z.string().email().max(100).transform(sanitizeStr),
  password: z.string().min(8).max(100)
});

const generateTokens = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
  return { token, refreshToken };
};

// Customer Registration
const register = async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      console.warn(`[VALIDATION_ERROR] register:`, parsed.error.issues);
      return res.status(400).json({ success: false, message: 'Invalid input provided. Please check your data and try again.' });
    }

    let { name, email, phone, password, gender } = parsed.data;
    email = email ? email.toLowerCase() : '';

    if (name && /[0-9]/.test(name)) {
      return res.status(400).json({ success: false, message: 'Invalid input provided. Please check your data and try again.' });
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    await pool.execute(
      'INSERT INTO users (id, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, name, email, phone, hashedPassword, 'customer']
    );

    // Create customer profile
    await pool.execute(
      'INSERT INTO customers (id, user_id, name, email, phone, gender) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), userId, name, email, phone, gender ? gender.toLowerCase() : null]
    );

    await pool.execute(
      'INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), 'ADMIN', 'New Client Registration', `${name} registered a new account.||client||${name}||${email}||${phone || ''}`, 'client']
    );

    // Send welcome email asynchronously
    sendEmail({
      to: email,
      subject: 'Welcome to Luxe Salon ✨',
      template: 'welcome',
      data: { name, loginUrl: `${process.env.FRONTEND_URL}/login` },
    }).catch(e => console.error('Background welcome email failed:', e));

    const { token, refreshToken } = generateTokens({ id: userId, email, role: 'customer' });
    res.status(201).json({
      success: true,
      message: 'Registration successful. Welcome to Luxe Salon!',
      data: { token, refreshToken, user: { id: userId, name, email, role: 'customer' } },
    });
  } catch (error) {
    next(error);
  }
};

// Login (Customer & Admin)
const login = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      console.warn(`[VALIDATION_ERROR] login:`, parsed.error.issues);
      return res.status(400).json({ success: false, message: 'Invalid credentials provided. Please try again.' });
    }

    let { email, password } = parsed.data;
    email = email ? email.toLowerCase() : '';

    const [users] = await pool.execute(
      'SELECT id, name, email, password, role, is_active FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact support.' });
    }

    if (user.role === 'admin' || user.role === 'super_admin') {
      return res.status(403).json({ success: false, message: 'Admin accounts must log in through the Admin Portal.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Update last login
    await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    if (user.role === 'customer') {
      // Get phone from customers table
      const [custInfo] = await pool.execute('SELECT phone FROM customers WHERE user_id = ?', [user.id]);
      const phone = custInfo[0]?.phone || '';
      await pool.execute(
        'INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), 'ADMIN', 'Client Logged In', `${user.name} has logged into their account.||client||${user.name}||${user.email}||${phone}`, 'client']
      );
    }

    // Send login notification email to client
    sendEmail({
      to: user.email,
      subject: 'Login Alert - TONI & GUY Essensuals ✦',
      template: 'login-notification',
      data: { name: user.name }
    }).catch(err => console.error('Failed to send login notification email:', err));

    const { token, refreshToken } = generateTokens(user);
    res.json({
      success: true,
      message: 'Login successful.',
      data: { token, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } },
    });
  } catch (error) {
    next(error);
  }
};

// Admin login (extra validation)
const adminLogin = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      console.warn(`[VALIDATION_ERROR] adminLogin:`, parsed.error.issues);
      return res.status(400).json({ success: false, message: 'Invalid credentials provided. Please try again.' });
    }

    let { email, password } = parsed.data;
    email = email ? email.toLowerCase() : '';

    const [users] = await pool.execute(
      "SELECT id, name, email, password, role, is_active FROM users WHERE email = ? AND role IN ('admin', 'super_admin')",
      [email]
    );

    console.log(`[AUTH] Admin login attempt for ${email}. Admin found: ${users.length > 0}`);

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Admin account deactivated.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`[AUTH] Password match: ${isMatch}`);
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }

    await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const userAgent = req.headers['user-agent'] || '';
    let deviceType = 'laptop';
    if (/Mobile|Android|iP(hone|od)/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/Tablet|iPad/i.test(userAgent)) {
      deviceType = 'tab';
    }
    let ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'Unknown';
    if (ip === '::1') ip = '127.0.0.1';
    if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
    
    await pool.execute(
      'INSERT INTO admin_logins (id, user_id, name, role, ip_address, device_type) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), user.id, user.name, user.role, ip, deviceType]
    );

    const { token, refreshToken } = generateTokens(user);
    res.json({
      success: true,
      message: 'Admin login successful.',
      data: { token, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } },
    });
  } catch (error) {
    next(error);
  }
};

// Get current user profile
const getMe = async (req, res, next) => {
  try {
    const [users] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
       c.id AS customer_id, c.total_visits, c.total_spent, c.membership_id
       FROM users u LEFT JOIN customers c ON c.user_id = u.id
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: users[0] });
  } catch (error) {
    next(error);
  }
};

// Forgot password - send reset email
const forgotPassword = async (req, res, next) => {
  try {
    let { email } = req.body;
    email = email ? email.toLowerCase().trim() : '';
    const [users] = await pool.execute('SELECT id, name FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Email address is not registered.' });
    }

    const user = users[0];
    const resetToken = uuidv4();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const [existingReset] = await pool.execute('SELECT * FROM password_resets WHERE user_id = ?', [user.id]);
    if (existingReset && existingReset.length > 0) {
      await pool.execute(
        'UPDATE password_resets SET token = ?, otp = ?, expires_at = ? WHERE user_id = ?',
        [resetToken, otp, resetExpiry, user.id]
      );
    } else {
      await pool.execute(
        'INSERT INTO password_resets (user_id, token, otp, expires_at) VALUES (?, ?, ?, ?)',
        [user.id, resetToken, otp, resetExpiry]
      );
    }

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const emailSent = await sendEmail({
      to: email,
      subject: 'Password Reset - Luxe Salon',
      template: 'reset-password',
      data: { name: user.name, resetUrl, otp },
    });

    // Always log OTP to backend console for debugging
    console.log(`\n🔐 PASSWORD RESET OTP for ${email}: ${otp}\n   Reset URL: ${resetUrl}\n`);

    // If email is not configured, return OTP in response so user can still reset
    const smtpConfigured = process.env.SMTP_USER && process.env.SMTP_USER !== 'your_email@gmail.com';
    if (!smtpConfigured || !emailSent) {
      return res.json({ 
        success: true, 
        message: 'Email service not configured. Use the OTP below to reset your password.',
        otp, // only returned when email fails
        resetUrl
      });
    }

    res.json({ success: true, message: 'Password reset link sent to your email.' });
  } catch (error) {
    next(error);
  }
};

// Reset password
const resetPassword = async (req, res, next) => {
  try {
    let { token, otp, email, password } = req.body;
    email = email ? email.toLowerCase().trim() : '';

    let resets = [];
    if (token) {
      const [resToken] = await pool.execute(
        'SELECT user_id FROM password_resets WHERE token = ? AND expires_at > NOW()',
        [token]
      );
      resets = resToken;
    } else if (otp && email) {
      const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (users.length > 0) {
        const [resOtp] = await pool.execute(
          'SELECT user_id FROM password_resets WHERE otp = ? AND user_id = ? AND expires_at > NOW()',
          [otp, users[0].id]
        );
        resets = resOtp;
      }
    } else {
      return res.status(400).json({ success: false, message: 'Provide either a reset token, or an email and OTP.' });
    }

    if (resets.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token or OTP.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, resets[0].user_id]);
    // Use user_id to delete to support both token/otp flows
    await pool.execute('DELETE FROM password_resets WHERE user_id = ?', [resets[0].user_id]);

    res.json({ success: true, message: 'Password reset successful. Please login.' });
  } catch (error) {
    next(error);
  }
};

// Refresh token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(401).json({ success: false, message: 'Refresh token required.' });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const [users] = await pool.execute('SELECT id, name, email, role FROM users WHERE id = ? AND is_active = 1', [decoded.id]);

    if (users.length === 0) return res.status(401).json({ success: false, message: 'Invalid token.' });

    const { token: newToken, refreshToken: newRefreshToken } = generateTokens(users[0]);
    res.json({ success: true, data: { token: newToken, refreshToken: newRefreshToken } });
  } catch (error) {
    next(error);
  }
};

// Change password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const [users] = await pool.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);

    const isMatch = await bcrypt.compare(currentPassword, users[0].password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

// Set password for users (e.g. Google Sign-In) who don't have or know their password
const setPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ success: true, message: 'Password added successfully.' });
  } catch (error) {
    next(error);
  }
};

// One-time magic link login — called by the "Secure Your Account" email button
// Validates a short-lived token stored in admin_magic_tokens, issues a full JWT session
const adminMagicLogin = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Magic token is required.' });
    }

    // Ensure the magic tokens table exists (auto-create if missing)
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

    // Postgres-compatible: use pool.execute with ? placeholders (converted internally)
    const [rows] = await pool.execute(
      "SELECT * FROM admin_magic_tokens WHERE token = ? AND used = 0",
      [token]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid or already-used security link.' });
    }

    const record = rows[0];

    // Check expiry (stored as ISO string)
    if (new Date(record.expires_at) < new Date()) {
      return res.status(401).json({ success: false, message: 'This security link has expired. Please log in manually.' });
    }

    // Mark token as used (one-time only)
    await pool.execute(
      'UPDATE admin_magic_tokens SET used = 1 WHERE token = ?',
      [token]
    );

    // Fetch the admin user
    const [users] = await pool.execute(
      "SELECT id, name, email, role, is_active FROM users WHERE id = ? AND role IN ('admin', 'super_admin')",
      [record.admin_id]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({ success: false, message: 'Admin account not found.' });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Admin account is deactivated.' });
    }

    // Issue full JWT session
    await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    const { token: jwtToken, refreshToken } = generateTokens(user);

    res.json({
      success: true,
      message: 'Security access granted.',
      data: { token: jwtToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } },
    });
  } catch (error) {
    next(error);
  }
};

// Get admin login logs
const getAdminLogins = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    const [logs] = await pool.execute(
      'SELECT id, name, role, ip_address, device_type, created_at FROM admin_logins ORDER BY created_at DESC LIMIT 50'
    );
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

// Google login
const googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Google token required.' });

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });
    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const response = await oauth2.userinfo.get();
    const payload = response.data;

    const email = payload.email;
    const name = payload.name;
    const isEmailVerified = payload.verified_email; // In v2, it's verified_email

    if (!isEmailVerified) {
      return res.status(401).json({ success: false, message: 'Google email not verified.' });
    }

    let [users] = await pool.execute('SELECT id, name, email, role, is_active FROM users WHERE email = ?', [email]);
    let user;

    if (users.length === 0) {
      // User doesn't exist, create one
      const userId = uuidv4();
      const randomPassword = await bcrypt.hash(uuidv4(), 10);
      
      await pool.execute(
        'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
        [userId, name, email, randomPassword, 'customer']
      );

      await pool.execute(
        'INSERT INTO customers (id, user_id, name, email) VALUES (?, ?, ?, ?)',
        [uuidv4(), userId, name, email]
      );

      await pool.execute(
        'INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), 'ADMIN', 'New Client Registration', `${name} registered via Google.||client||${name}||${email}||`, 'client']
      );

      user = { id: userId, name, email, role: 'customer' };
    } else {
      user = users[0];
      if (!user.is_active) {
        return res.status(403).json({ success: false, message: 'Account deactivated. Contact support.' });
      }

      if (user.role === 'admin' || user.role === 'super_admin') {
        return res.status(403).json({ success: false, message: 'Admin accounts must log in through the Admin Portal.' });
      }

      await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    }

    if (user.role === 'customer') {
      const [custInfo] = await pool.execute('SELECT phone FROM customers WHERE user_id = ?', [user.id]);
      const phone = custInfo[0]?.phone || '';
      await pool.execute(
        'INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), 'ADMIN', 'Client Logged In', `${user.name} logged in via Google.||client||${user.name}||${user.email}||${phone}`, 'client']
      );
    }

    const { token: jwtToken, refreshToken } = generateTokens(user);
    res.json({
      success: true,
      message: 'Google login successful.',
      data: { token: jwtToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({ success: false, message: 'Invalid Google token.' });
  }
};

module.exports = { register, login, adminLogin, adminMagicLogin, getMe, forgotPassword, resetPassword, refreshToken, changePassword, setPassword, getAdminLogins, googleLogin };
