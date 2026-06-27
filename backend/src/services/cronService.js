const cron = require('node-cron');
const db = require('../config/database');
const { pool } = db;
const { sendEmail } = require('./emailService');
const { v4: uuidv4 } = require('uuid');

const runWinBackCampaign = async () => {
  console.log('🔄 Running win-back email campaign...');
  try {
    const intervals = [30, 60, 90];
    for (const days of intervals) {
      let query;
      if (db.usePostgres) {
        query = `SELECT c.id, c.name, c.email, (NOW()::date - c.last_visit::date) AS days_since
          FROM customers c
          WHERE c.email IS NOT NULL
          AND c.last_visit IS NOT NULL
          AND (NOW()::date - c.last_visit::date) BETWEEN ? AND ?
          AND NOT EXISTS (
            SELECT 1 FROM email_sent_log el
            WHERE el.customer_id = c.id AND el.type = 'win_back' AND el.days_trigger = ?
            AND el.sent_at >= NOW() - (CAST(? AS INT) * INTERVAL '1 day')
          )`;
      } else {
        query = `SELECT c.id, c.name, c.email, DATEDIFF(NOW(), c.last_visit) AS days_since
          FROM customers c
          WHERE c.email IS NOT NULL
          AND c.last_visit IS NOT NULL
          AND DATEDIFF(NOW(), c.last_visit) BETWEEN ? AND ?
          AND NOT EXISTS (
            SELECT 1 FROM email_sent_log el
            WHERE el.customer_id = c.id AND el.type = 'win_back' AND el.days_trigger = ?
            AND el.sent_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          )`;
      }

      const [customers] = await pool.execute(query, [days, days + 1, days, days]);

      for (const customer of customers) {
        try {
          await sendEmail({
            to: customer.email,
            subject: `${customer.name}, we miss you at Luxe Salon! 💛`,
            template: 'win-back',
            data: { name: customer.name, days, offer: days >= 60 ? '15% off your next visit' : null },
          });

          await pool.execute(
            'INSERT INTO email_sent_log (id, customer_id, type, days_trigger, sent_at) VALUES (?, ?, ?, ?, NOW())',
            [uuidv4(), customer.id, 'win_back', days]
          );
          console.log(`✉️  Win-back email sent to ${customer.email} (${days} day trigger)`);
        } catch (emailError) {
          console.error(`Failed to send win-back to ${customer.email}:`, emailError.message);
        }
      }
    }
  } catch (error) {
    console.error('Win-back campaign error:', error.message);
  }
};

const runMembershipExpiryReminder = async () => {
  try {
    let query;
    if (db.usePostgres) {
      query = `SELECT c.name, c.email, c.membership_expiry, mp.name AS plan_name
        FROM customers c JOIN membership_plans mp ON c.membership_id = mp.id
        WHERE c.email IS NOT NULL AND c.membership_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 DAY'`;
    } else {
      query = `SELECT c.name, c.email, c.membership_expiry, mp.name AS plan_name
        FROM customers c JOIN membership_plans mp ON c.membership_id = mp.id
        WHERE c.email IS NOT NULL AND c.membership_expiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)`;
    }
    const [expiring] = await pool.execute(query);

    for (const customer of expiring) {
      await sendEmail({
        to: customer.email,
        subject: 'Your Luxe Salon Membership is Expiring Soon',
        html: `<p>Dear ${customer.name}, your ${customer.plan_name} membership expires on ${customer.membership_expiry}. Renew now to keep enjoying exclusive benefits.</p>`,
      }).catch(() => {});
    }
    console.log(`📧 Sent ${expiring.length} membership expiry reminders`);
  } catch (error) {
    console.error('Membership reminder error:', error.message);
  }
};

const cleanupOldData = async () => {
  try {
    if (db.usePostgres) {
      await pool.execute("DELETE FROM email_sent_log WHERE sent_at < NOW() - INTERVAL '1 YEAR'");
      await pool.execute("UPDATE leads SET status = 'archived' WHERE created_at < NOW() - INTERVAL '180 DAY' AND status IN ('converted', 'lost')");
    } else {
      await pool.execute("DELETE FROM email_sent_log WHERE sent_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)");
      await pool.execute("UPDATE leads SET status = 'archived' WHERE created_at < DATE_SUB(NOW(), INTERVAL 180 DAY) AND status IN ('converted', 'lost')");
    }
    console.log('🧹 Cleanup complete');
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
};

const startCronJobs = () => {
  // Win-back campaign: Daily at 10 AM
  cron.schedule('0 10 * * *', runWinBackCampaign, { timezone: 'Asia/Kolkata' });

  // Membership expiry reminder: Daily at 9 AM
  cron.schedule('0 9 * * *', runMembershipExpiryReminder, { timezone: 'Asia/Kolkata' });

  // Cleanup: Weekly on Sunday at 2 AM
  cron.schedule('0 2 * * 0', cleanupOldData, { timezone: 'Asia/Kolkata' });

  console.log('⏰ Cron jobs started (Win-back, Membership reminders, Cleanup)');
};

module.exports = { startCronJobs, runWinBackCampaign };
