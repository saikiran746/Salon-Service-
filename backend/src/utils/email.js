const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const { pool } = require('../config/database');

const getOAuth2Client = () => {
  const OAuth2 = google.auth.OAuth2;
  const oauth2Client = new OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return oauth2Client;
};

// Check environment variables on startup
const checkEmailEnv = () => {
  console.log('[EMAIL] Checking environment variables...');
  const vars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM_ADDRESS', 'EMAIL_FROM_NAME'];
  vars.forEach(v => {
    if (!process.env[v]) {
      console.warn(`[EMAIL WARNING] Environment variable ${v} is missing.`);
    } else {
      console.log(`[EMAIL INFO] ${v} is set.`);
    }
  });
};
checkEmailEnv();

const fetchEmailSettings = async () => {
  try {
    const [rows] = await pool.execute('SELECT site_name, address, phone, email FROM site_settings LIMIT 1');
    if (rows && rows.length > 0) {
      const row = rows[0];
      const formatContactInfo = (val) => {
        if (!val) return '';
        return val.replace(/\r?\n/g, ' / ');
      };
      return {
        site_name: row.site_name || 'TONI & GUY ESSENSUALS',
        address: row.address || '123 Royal Avenue, Mumbai, Maharashtra 400001',
        phone: formatContactInfo(row.phone) || '+91 98765 43210',
        email: formatContactInfo(row.email) || 'info@essensualskondapur.com'
      };
    }
  } catch (error) {
    console.error('Error fetching site settings for email:', error.message);
  }
  return {
    site_name: 'TONI & GUY ESSENSUALS',
    address: '123 Royal Avenue, Mumbai, Maharashtra 400001',
    phone: '+91 98765 43210',
    email: 'info@essensualskondapur.com'
  };
};

const baseTemplate = (content, settings) => {
  const siteName = settings ? settings.site_name : 'TONI & GUY ESSENSUALS';
  const address = settings ? settings.address : '123 Royal Avenue, Mumbai, Maharashtra 400001';
  const phone = settings ? settings.phone : '+91 98765 43210';
  const email = settings ? settings.email : 'info@essensualskondapur.com';

  return `
<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: 'Georgia', serif; background: #f9f5ef; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
  .header { background: #0a0a0a; padding: 40px; text-align: center; }
  .logo { color: #C9A84C; font-size: 28px; font-weight: bold; letter-spacing: 4px; }
  .tagline { color: #888; font-size: 11px; letter-spacing: 2px; margin-top: 4px; }
  .body { padding: 40px; color: #333; line-height: 1.8; }
  .body h2 { color: #0a0a0a; font-size: 22px; }
  .btn { display: inline-block; background: #C9A84C; color: #0a0a0a; padding: 14px 32px;
         text-decoration: none; font-weight: bold; letter-spacing: 1px; margin: 20px 0; border-radius: 2px; }
  .footer { background: #0a0a0a; padding: 24px; text-align: center; color: #666; font-size: 12px; }
  .gold { color: #C9A84C; }
  .divider { border: none; border-top: 1px solid #e8e8e8; margin: 24px 0; }
  .info-box { background: #f9f5ef; border-left: 3px solid #C9A84C; padding: 16px; margin: 16px 0; }
</style></head>
<body><div class="container">
  <div class="header">
    <div class="logo">✦ TONI &amp; GUY ESSENSUALS</div>
    <div class="tagline">WHERE LUXURY MEETS ARTISTRY</div>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
    <p>${address}</p>
    <p>${phone}${phone && email ? ' | ' : ''}${email}</p>
  </div>
</div></body></html>`;
};

const templates = {
  welcome: (data, settings) => baseTemplate(`
    <h2>Welcome to <span class="gold">${settings.site_name || 'Toni & Guy Essensuals'}</span>, ${data.name}! ✨</h2>
    <p>We are thrilled to welcome you to our exclusive community of distinguished clients.</p>
    <p>At ${settings.site_name || 'Toni & Guy Essensuals'}, every visit is crafted to be an extraordinary experience of luxury and transformation.</p>
    <div class="info-box">
      <strong>Your account is now active.</strong> You can now:
      <ul><li>Book appointments with our specialist stylists</li>
      <li>View your appointment history</li>
      <li>Explore our exclusive membership plans</li></ul>
    </div>
    <a href="${data.loginUrl}" class="btn">BOOK YOUR FIRST APPOINTMENT</a>
    <hr class="divider">
    <p>For any assistance, contact us at <span class="gold">${settings.email || 'info@essensualskondapur.com'}</span></p>`, settings),

  'appointment-confirmation': (data, settings) => baseTemplate(`
    <h2>Appointment <span class="gold">Confirmed</span> ✓</h2>
    <p>Dear ${data.name},</p>
    <p>Your appointment has been confirmed. We look forward to serving you.</p>
    <div class="info-box">
      <strong>Appointment Details:</strong><br><br>
      🪒 <strong>Service:</strong> ${data.service}<br>
      👤 <strong>Specialist:</strong> ${data.staff || 'To be assigned'}<br>
      📅 <strong>Date:</strong> ${new Date(data.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}<br>
      ⏰ <strong>Time:</strong> ${data.time}
    </div>
    <p><strong>Please arrive 5 minutes early.</strong> If you need to reschedule or cancel, please do so at least 2 hours in advance.</p>
    <a href="${process.env.FRONTEND_URL}/dashboard" class="btn">VIEW MY APPOINTMENTS</a>`, settings),

  'appointment-cancelled': (data, settings) => baseTemplate(`
    <h2>Appointment <span class="gold">Cancelled</span></h2>
    <p>Dear ${data.name},</p>
    <p>Your appointment for <strong>${data.service}</strong> on <strong>${data.date}</strong> has been cancelled.</p>
    <p>We hope to serve you again soon. Book a new appointment at your convenience.</p>
    <a href="${process.env.FRONTEND_URL}/book" class="btn">BOOK AGAIN</a>`, settings),

  'appointment-rescheduled': (data, settings) => baseTemplate(`
    <h2>Appointment <span class="gold">Rescheduled</span></h2>
    <p>Dear ${data.name},</p>
    <p>Your appointment has been rescheduled to:</p>
    <div class="info-box">
      📅 <strong>New Date:</strong> ${data.date}<br>
      ⏰ <strong>New Time:</strong> ${data.time}
    </div>
    <a href="${process.env.FRONTEND_URL}/dashboard" class="btn">VIEW APPOINTMENT</a>`, settings),

  'reset-password': (data, settings) => baseTemplate(`
    <h2>Reset Your <span class="gold">Password</span></h2>
    <p>Dear ${data.name},</p>
    <p>We received a request to reset your password. You can use the 6-digit OTP below or click the reset link.</p>
    <div style="background:#f9f5ef;border:2px dashed #C9A84C;padding:24px;text-align:center;font-size:36px;letter-spacing:12px;font-weight:bold;color:#0a0a0a;margin:32px 0;">
      ${data.otp}
    </div>
    <div style="text-align:center;">
      <p style="margin-bottom: 16px;">Or click the button below:</p>
      <a href="${data.resetUrl}" class="btn">RESET PASSWORD LINK</a>
    </div>
    <p style="color:#999;font-size:12px;margin-top:24px;">This code and link expire in 1 hour. If you didn't request this, ignore this email.</p>`, settings),

  invoice: (data, settings) => baseTemplate(`
    <h2>Your <span class="gold">Invoice</span> is Ready</h2>
    <p>Dear ${data.name},</p>
    <p>Thank you for visiting ${settings.site_name || 'Toni & Guy Essensuals'}. Please find your invoice attached.</p>
    <div class="info-box">
      📄 <strong>Invoice Number:</strong> ${data.invoiceNumber}<br>
      💰 <strong>Total Amount:</strong> ₹${parseFloat(data.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
    </div>
    <p>Thank you for choosing ${settings.site_name || 'Toni & Guy Essensuals'}. We hope to see you again!</p>
    <a href="${process.env.FRONTEND_URL}/dashboard/bills" class="btn">VIEW INVOICES</a>`, settings),

  'membership-welcome': (data, settings) => baseTemplate(`
    <h2>Welcome to <span class="gold">${settings.site_name || 'Toni & Guy Essensuals'} Membership</span>! 🌟</h2>
    <p>Dear ${data.name},</p>
    <p>Your <strong class="gold">${data.plan}</strong> membership has been activated.</p>
    <div class="info-box">
      ✨ <strong>Membership Benefits:</strong><br>
      💎 ${data.discount}% discount on all services<br>
      📅 Valid until: ${data.expiry}<br>
      🎁 Exclusive member privileges
    </div>
    <a href="${process.env.FRONTEND_URL}/memberships" class="btn">EXPLORE BENEFITS</a>`, settings),

  'win-back': (data, settings) => baseTemplate(`
    <h2>We <span class="gold">Miss You</span>, ${data.name}! 💛</h2>
    <p>It's been ${data.days} days since your last visit, and we'd love to welcome you back.</p>
    <p>Treat yourself to our latest services and exclusive offers.</p>
    ${data.offer ? `<div class="info-box">🎁 <strong>Special Offer for You:</strong> ${data.offer}</div>` : ''}
    <a href="${process.env.FRONTEND_URL}/book" class="btn">BOOK NOW</a>
    <a href="${process.env.FRONTEND_URL}/services" style="display:inline-block;margin-left:16px;color:#C9A84C;">View Services →</a>`, settings),

  'new-lead': (data, settings) => baseTemplate(`
    <h2>🔔 New Lead Captured</h2>
    <div class="info-box">
      👤 <strong>Name:</strong> ${data.name}<br>
      📧 <strong>Email:</strong> ${data.email || 'Not provided'}<br>
      📱 <strong>Phone:</strong> ${data.phone || 'Not provided'}<br>
      🌐 <strong>Source:</strong> ${data.source}<br>
      📄 <strong>Page:</strong> ${data.page_visited || 'Unknown'}
    </div>
    <a href="${process.env.FRONTEND_URL}/admin/leads" class="btn">VIEW IN ADMIN</a>`, settings),

  'login-notification': (data, settings) => baseTemplate(`
    <h2>Welcome Back to <span class="gold">Toni & Guy Essensuals</span>! ✨</h2>
    <p>Dear ${data.name},</p>
    <p>We're thrilled to have you back! Your style journey continues here. 🌟 You have successfully logged in to your account.</p>
    <div class="info-box">
      💈 <strong>Ready for your next transformation?</strong> Explore our trending services, book your next session with your favorite artisan, and unlock exclusive loyalty rewards. 💎
    </div>
    <p>Thank you for choosing us to help you look and feel your absolute best! ✦</p>
    <a href="${process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? process.env.API_BASE_URL : 'http://localhost:5173')}" class="btn">BOOK YOUR SESSION NOW</a>`, settings),

  // Security alert — sent to secondary_alert_email when admin credentials are changed
  // Uses the same SMTP transport as all other emails; does NOT affect invoice/booking/login flows
  'admin-credentials-changed': (data, settings) => baseTemplate(`
    <h2 style="color:#c0392b;">⚠️ Admin Credentials Changed</h2>
    <p>This is an automated security alert from your <strong>TONI &amp; GUY Salon Management System</strong>.</p>
    <div class="info-box" style="border-left-color:#c0392b;">
      🔐 <strong>What Changed:</strong> ${data.changedFields}<br>
      👤 <strong>Admin Name:</strong> ${data.adminName}<br>
      📧 <strong>Admin Email:</strong> ${data.adminEmail}<br>
      🕐 <strong>Changed At:</strong> ${data.changedAt}
    </div>
    <p><strong>If you authorised this change</strong>, no action is needed.</p>
    <p><strong>If you did NOT authorise this change</strong>, please log into the admin portal immediately and reset your credentials to secure your account.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${data.loginUrl}" class="btn" style="background:#c0392b;color:#fff;">SECURE YOUR ACCOUNT NOW</a>
    </div>
    <p style="color:#999;font-size:12px;">This alert was sent to the secondary security email configured in your Salon Site Settings. To update or remove this email, log in as admin and visit Site Settings → Admin Security.</p>`, settings),
};

const sendEmail = async ({ to, subject, template, data, html, attachments }) => {
  console.log(`[EMAIL] Attempting to send email to ${to}`);
  try {
    const settings = await fetchEmailSettings();
    const htmlContent = html || (templates[template] ? templates[template](data || {}, settings) : baseTemplate(html || '', settings));
    const fromName = process.env.EMAIL_FROM_NAME || settings.site_name || 'TONI & GUY ESSENSUALS';

    let finalSubject = subject;
    if (finalSubject) {
      finalSubject = finalSubject.replace(/Luxe Salon/gi, settings.site_name || 'TONI & GUY ESSENSUALS');
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('[EMAIL] Failed: Missing SMTP credentials in environment variables.');
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('[EMAIL] SMTP transporter created');

    console.log('[EMAIL] Sending...');
    await transporter.sendMail({
      from: `"${fromName}" <${process.env.SMTP_USER}>`,
      replyTo: process.env.SMTP_USER,
      to, subject: finalSubject,
      html: htmlContent,
      text: htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
      attachments: attachments || [],
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': `${settings.site_name || 'TONI & GUY ESSENSUALS'} System`,
        'Precedence': 'bulk',
        'List-Unsubscribe': `<mailto:${process.env.SMTP_USER}>`,
      },
    });
    console.log(`[EMAIL] Success`);
    return true;
  } catch (error) {
    console.error(`[EMAIL] Failed:`, error);
    return false;
  }
};

module.exports = { sendEmail };

