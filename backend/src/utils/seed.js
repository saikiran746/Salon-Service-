/**
 * Seed Script — Creates default admin user
 * Run: node src/utils/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool, testConnection } = require('../config/database');

async function seed() {
  await testConnection();

  console.log('🌱 Starting seed...');

  // Create super admin
  const adminId = 'admin-001';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@luxesalon.com';
  const adminPass = await bcrypt.hash(process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123456', 12);

  const [existingUser] = await pool.execute(
    'SELECT * FROM users WHERE email = ?',
    [adminEmail]
  );

  if (existingUser && existingUser.length > 0) {
    await pool.execute(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
      [adminPass, adminEmail]
    );
  } else {
    await pool.execute(
      "INSERT INTO users (id, name, email, phone, password, role) VALUES (?, 'Salon Admin', ?, '+919876543210', ?, 'super_admin')",
      [adminId, adminEmail, adminPass]
    );
  }

  console.log('✅ Admin user created/updated');
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123456'}`);

  // Default membership plans
  const plans = [
    { id: 'mem-001', name: 'Silver', description: 'Perfect for occasional visitors', price: 1999, days: 180, discount: 10, benefits: JSON.stringify(['10% discount on all services', 'Priority booking', 'Complimentary consultation', 'Birthday special offer']) },
    { id: 'mem-002', name: 'Gold', description: 'Most popular plan for regulars', price: 3499, days: 365, discount: 20, benefits: JSON.stringify(['20% discount on all services', 'Priority booking', 'Free consultation', '2 complimentary treatments', 'Birthday month special']) },
    { id: 'mem-003', name: 'Platinum', description: 'Ultimate luxury experience', price: 5999, days: 365, discount: 30, benefits: JSON.stringify(['30% discount on all services', 'VIP priority booking', 'Free analysis', '4 complimentary treatments', 'Dedicated stylist', 'Birthday week special']) },
  ];

  for (const plan of plans) {
    const [existingPlan] = await pool.execute(
      'SELECT * FROM membership_plans WHERE id = ?',
      [plan.id]
    );
    if (existingPlan && existingPlan.length > 0) {
      await pool.execute(
        'UPDATE membership_plans SET name = ?, description = ?, price = ?, validity_days = ?, discount = ?, benefits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [plan.name, plan.description, plan.price, plan.days, plan.discount, plan.benefits, plan.id]
      );
    } else {
      await pool.execute(
        'INSERT INTO membership_plans (id, name, description, price, validity_days, discount, benefits) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [plan.id, plan.name, plan.description, plan.price, plan.days, plan.discount, plan.benefits]
      );
    }
  }
  console.log('✅ Membership plans seeded');

  // Default email templates
  const templates = [
    { name: '30-Day Win-Back', subject: 'We miss you, {{name}}! 💛', body: 'Dear {{name}},\n\nIt\'s been 30 days since your last visit. We\'d love to welcome you back!\n\nBook now: ' + process.env.FRONTEND_URL + '/book', trigger_days: 30 },
    { name: '60-Day Win-Back', subject: 'Come back to Luxe Salon, {{name}} 🌟', body: 'Dear {{name}},\n\nWe haven\'t seen you in 2 months! Your style awaits.\n\nEnjoy 10% off your next visit. Book now: ' + process.env.FRONTEND_URL + '/book', trigger_days: 60 },
    { name: '90-Day Win-Back', subject: 'Special offer just for you, {{name}} ✨', body: 'Dear {{name}},\n\nIt\'s been 3 months! We miss you. Come back and enjoy 15% off.\n\nBook now: ' + process.env.FRONTEND_URL + '/book', trigger_days: 90 },
  ];

  for (const t of templates) {
    const [existingTemplate] = await pool.execute(
      'SELECT * FROM email_templates WHERE name = ?',
      [t.name]
    );
    if (existingTemplate && existingTemplate.length > 0) {
      await pool.execute(
        'UPDATE email_templates SET subject = ?, body = ?, trigger_days = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?',
        [t.subject, t.body, t.trigger_days, t.name]
      );
    } else {
      await pool.execute(
        'INSERT INTO email_templates (id, name, subject, body, trigger_days) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), t.name, t.subject, t.body, t.trigger_days]
      );
    }
  }
  console.log('✅ Email templates seeded');

  console.log('\n🎉 Seed complete! You can now login to the admin panel.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
