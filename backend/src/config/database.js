const { Pool: PgPool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

let activePool = null;

const pool = {
  execute: async (query, params = []) => {
    if (!activePool) throw new Error('Database connection pool is not initialized yet.');
    return activePool.execute(query, params);
  },
  query: async (query, params = []) => {
    if (!activePool) throw new Error('Database connection pool is not initialized yet.');
    return activePool.query ? activePool.query(query, params) : activePool.execute(query, params);
  }
};

function convertPlaceholders(query) {
  let index = 1;
  return query.replace(/\?/g, () => `$${index++}`);
}

async function testConnection() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured in .env');
  }

  console.log('🔌 Connecting to PostgreSQL Database...');
  const pgPool = new PgPool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pgPool.on('error', (err) => {
    console.warn('⚠️ Unexpected error on idle PostgreSQL client:', err.message);
  });

  pgPool.execute = async (query, params = []) => {
    const formatted = convertPlaceholders(query);
    const result = await pgPool.query(formatted, params);
    return [result.rows, result];
  };

  activePool = pgPool;
  console.log('✅ PostgreSQL connected successfully');

  try {
    await initializePostgresSchema(pool);
  } catch (migErr) {
    console.warn('⚠️ Migration warning:', migErr.message);
  }
}

async function initializePostgresSchema(pool) {
  const runQuery = async (q) => {
    return pool.execute(q).catch(err => {
      throw err;
    });
  };

  try {
    await runQuery(`CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(50),
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'customer',
      is_active INTEGER DEFAULT 1,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      date_of_birth DATE,
      gender VARCHAR(20),
      address TEXT,
      notes TEXT,
      source VARCHAR(50) DEFAULT 'online',
      membership_id VARCHAR(255),
      membership_expiry DATE,
      total_visits INTEGER DEFAULT 0,
      total_spent DECIMAL(10, 2) DEFAULT 0.00,
      last_visit TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS password_resets (
      user_id VARCHAR(255) PRIMARY KEY,
      token VARCHAR(255) UNIQUE NOT NULL,
      otp VARCHAR(10),
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS services (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      duration INTEGER NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      specialist_type VARCHAR(255),
      category VARCHAR(255) DEFAULT 'general',
      image VARCHAR(255),
      image_public_id VARCHAR(255),
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS staff (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE,
      phone VARCHAR(50),
      gender VARCHAR(20),
      experience VARCHAR(255),
      specializations TEXT,
      bio TEXT,
      photo VARCHAR(255),
      photo_public_id VARCHAR(255),
      rating DECIMAL(3, 2) DEFAULT 0.00,
      review_count INTEGER DEFAULT 0,
      total_clients INTEGER DEFAULT 0,
      total_revenue DECIMAL(10, 2) DEFAULT 0.00,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS membership_plans (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      validity_days INTEGER NOT NULL DEFAULT 365,
      discount DECIMAL(5, 2) DEFAULT 0.00,
      benefits TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS membership_purchases (
      id VARCHAR(255) PRIMARY KEY,
      customer_id VARCHAR(255) NOT NULL,
      plan_id VARCHAR(255) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'online',
      purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at DATE NOT NULL
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS appointments (
      id VARCHAR(255) PRIMARY KEY,
      customer_id VARCHAR(255),
      service_id VARCHAR(255) NOT NULL,
      staff_id VARCHAR(255),
      appointment_date DATE NOT NULL,
      appointment_time TIME NOT NULL,
      duration INTEGER,
      price DECIMAL(10, 2),
      notes TEXT,
      status VARCHAR(50) DEFAULT 'confirmed',
      source VARCHAR(50) DEFAULT 'online',
      bill_id VARCHAR(255),
      service_ids TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS bills (
      id VARCHAR(255) PRIMARY KEY,
      invoice_number VARCHAR(255) UNIQUE NOT NULL,
      appointment_id VARCHAR(255),
      customer_id VARCHAR(255),
      subtotal DECIMAL(10, 2) NOT NULL,
      discount_percent DECIMAL(5, 2) DEFAULT 0,
      discount_amount DECIMAL(10, 2) DEFAULT 0,
      tax_percent DECIMAL(5, 2) DEFAULT 18.00,
      tax_amount DECIMAL(10, 2) DEFAULT 0,
      total_amount DECIMAL(10, 2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'cash',
      status VARCHAR(50) DEFAULT 'paid',
      pdf_path VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS bill_items (
      id VARCHAR(255) PRIMARY KEY,
      bill_id VARCHAR(255) NOT NULL,
      description VARCHAR(255) NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit_price DECIMAL(10, 2) NOT NULL,
      total_price DECIMAL(10, 2) NOT NULL,
      discount_percentage DECIMAL(5, 2) DEFAULT 0,
      final_amount DECIMAL(10, 2)
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS reviews (
      id VARCHAR(255) PRIMARY KEY,
      staff_id VARCHAR(255) NOT NULL,
      customer_id VARCHAR(255) NOT NULL,
      appointment_id VARCHAR(255) UNIQUE NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS gallery_posts (
      id VARCHAR(255) PRIMARY KEY,
      title VARCHAR(255),
      caption TEXT,
      media_url VARCHAR(255) NOT NULL,
      media_public_id VARCHAR(255),
      media_type VARCHAR(50) DEFAULT 'image',
      tags TEXT,
      category VARCHAR(255) DEFAULT 'All',
      is_before_after INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      likes_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS leads (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE,
      phone VARCHAR(50),
      source VARCHAR(50) DEFAULT 'website',
      page_visited VARCHAR(255),
      status VARCHAR(50) DEFAULT 'new',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS email_templates (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      trigger_days INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS email_campaigns (
      id VARCHAR(255) PRIMARY KEY,
      template_id VARCHAR(255),
      subject VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      recipients_count INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS email_logs (
      id VARCHAR(255) PRIMARY KEY,
      campaign_id VARCHAR(255),
      customer_id VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'delivered',
      error_message TEXT,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255),
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      is_cleared INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS cleared_notifications (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255),
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS staff_shifts (
      id VARCHAR(255) PRIMARY KEY,
      staff_id VARCHAR(255) NOT NULL,
      date VARCHAR(255) NOT NULL,
      start_time VARCHAR(255) NOT NULL,
      end_time VARCHAR(255) NOT NULL,
      break_start VARCHAR(255),
      break_duration INTEGER DEFAULT 60,
      is_off INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS staff_leaves (
      id VARCHAR(255) PRIMARY KEY,
      staff_id VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL,
      start_date VARCHAR(255) NOT NULL,
      end_date VARCHAR(255) NOT NULL,
      reason TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS staff_attendance (
      id VARCHAR(255) PRIMARY KEY,
      staff_id VARCHAR(255) NOT NULL,
      date VARCHAR(255) NOT NULL,
      check_in VARCHAR(255),
      check_out VARCHAR(255),
      total_hours DECIMAL(5, 2) DEFAULT 0.00,
      status VARCHAR(50) DEFAULT 'present',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS admin_logins (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      ip_address VARCHAR(255),
      device_type VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS site_settings (
      id VARCHAR(255) PRIMARY KEY,
      site_name VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(255),
      address TEXT,
      maps_link TEXT,
      whatsapp VARCHAR(50),
      instagram VARCHAR(255),
      facebook VARCHAR(255),
      twitter VARCHAR(255),
      working_hours TEXT,
      closed_days TEXT,
      closed_slots TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
      id VARCHAR(255) PRIMARY KEY,
      campaign_name VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      recipient_count INTEGER NOT NULL,
      sent_count INTEGER NOT NULL,
      failed_count INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS campaign_histories (
      id VARCHAR(255) PRIMARY KEY,
      campaign_name VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      total_recipients INTEGER NOT NULL,
      sent_count INTEGER NOT NULL,
      failed_count INTEGER NOT NULL,
      status VARCHAR(50) DEFAULT 'PENDING',
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      created_by VARCHAR(255)
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS campaign_recipients (
      id VARCHAR(255) PRIMARY KEY,
      campaign_id VARCHAR(255) NOT NULL,
      customer_id VARCHAR(255),
      phone VARCHAR(50) NOT NULL,
      status VARCHAR(50) DEFAULT 'PENDING',
      error_message TEXT,
      sent_at TIMESTAMP NULL
    )`);

    await runQuery('CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_appt ON appointments (customer_id, appointment_date, appointment_time, service_id)').catch(() => {});

    console.log('✅ PostgreSQL schema created successfully');

    // ==================== AUTO-SEED DEFAULT DATA ====================
    
    // 1. Seed super admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@luxesalon.com';
    const [adminRow] = await pool.execute('SELECT * FROM users WHERE email = ?', [adminEmail]);
    if (adminRow.length === 0) {
      const adminPass = await bcrypt.hash(process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123456', 12);
      await pool.execute(
        "INSERT INTO users (id, name, email, phone, password, role) VALUES ('admin-001', 'Salon Admin', ?, '+919876543210', ?, 'super_admin')",
        [adminEmail, adminPass]
      );
      console.log('🌱 Seeded super admin account:', adminEmail);
    }

    // 2. Seed membership plans
    const [plansRow] = await pool.execute('SELECT * FROM membership_plans');
    if (plansRow.length === 0) {
      const plans = [
        { id: 'mem-001', name: 'Silver', description: 'Perfect for occasional visitors', price: 1999, days: 180, discount: 10, benefits: JSON.stringify(['10% discount on all services', 'Priority booking', 'Complimentary consultation', 'Birthday special offer']) },
        { id: 'mem-002', name: 'Gold', description: 'Most popular plan for regulars', price: 3499, days: 365, discount: 20, benefits: JSON.stringify(['20% discount on all services', 'Priority booking', 'Free consultation', '2 complimentary treatments', 'Birthday month special']) },
        { id: 'mem-003', name: 'Platinum', description: 'Ultimate luxury experience', price: 5999, days: 365, discount: 30, benefits: JSON.stringify(['30% discount on all services', 'VIP priority booking', 'Free analysis', '4 complimentary treatments', 'Dedicated stylist', 'Birthday week special']) },
      ];
      for (const p of plans) {
        await pool.execute(
          'INSERT INTO membership_plans (id, name, description, price, validity_days, discount, benefits) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [p.id, p.name, p.description, p.price, p.days, p.discount, p.benefits]
        );
      }
      console.log('🌱 Seeded membership plans.');
    }

    // 3. Seed email templates
    const [tempRow] = await pool.execute('SELECT * FROM email_templates');
    if (tempRow.length === 0) {
      const templates = [
        { id: uuidv4(), name: '30-Day Win-Back', subject: 'We miss you, {{name}}! 💛', body: 'Dear {{name}},\n\nIt\'s been 30 days since your last visit. We\'d love to welcome you back!\n\nBook now: ' + (process.env.FRONTEND_URL || 'http://localhost:5173') + '/book', trigger_days: 30 },
        { id: uuidv4(), name: '60-Day Win-Back', subject: 'Come back to Luxe Salon, {{name}} 🌟', body: 'Dear {{name}},\n\nWe haven\'t seen you in 2 months! Your style awaits.\n\nEnjoy 10% off your next visit. Book now: ' + (process.env.FRONTEND_URL || 'http://localhost:5173') + '/book', trigger_days: 60 },
        { id: uuidv4(), name: '90-Day Win-Back', subject: 'Special offer just for you, {{name}} ✨', body: 'Dear {{name}},\n\nIt\'s been 3 months! We miss you. Come back and enjoy 15% off.\n\nBook now: ' + (process.env.FRONTEND_URL || 'http://localhost:5173') + '/book', trigger_days: 90 },
      ];
      for (const t of templates) {
        await pool.execute(
          'INSERT INTO email_templates (id, name, subject, body, trigger_days) VALUES (?, ?, ?, ?, ?)',
          [t.id, t.name, t.subject, t.body, t.trigger_days]
        );
      }
      console.log('🌱 Seeded win-back email templates.');
    }

    // 4. Seed master stylists / specialists
    const [staffRow] = await pool.execute('SELECT * FROM staff');
    if (staffRow.length === 0) {
      const staff = [
        { id: 'staff-001', name: 'Elena Rostova', experience: '8 Years', rating: 4.9, bio: 'Senior aesthetician specializing in Dermalogica, Skin Regimen, and advanced clinical facials.', photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400', specializations: 'Skin Treatment, Add-On' },
        { id: 'staff-002', name: 'Priya Sharma', experience: '6 Years', rating: 4.8, bio: 'Talented nail artist specializing in Dead Sea minerals and luxury manicures/pedicures.', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400', specializations: 'Manicure, Pedicure' },
        { id: 'staff-003', name: 'Zara Khan', experience: '7 Years', rating: 4.9, bio: 'Highly skilled beauty therapist specializing in precision eyebrow threading and premium waxing.', photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400', specializations: 'Bleaching & De-Tan, Threading, Waxing, Add-On' },
        { id: 'staff-004', name: 'David Miller', experience: '9 Years', rating: 4.7, bio: 'Expert therapist focusing on advanced tan removal, skin lightening, and sensitive skin facial rituals.', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400', specializations: 'Skin Treatment, Bleaching & De-Tan' }
      ];
      for (const s of staff) {
        await pool.execute(
          'INSERT INTO staff (id, name, experience, rating, bio, photo, specializations) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [s.id, s.name, s.experience, s.rating, s.bio, s.photo, s.specializations]
        );
      }
      console.log('🌱 Seeded specialists roster.');
    }

    // 5. Seed gallery lightbox posts
    const [galleryRow] = await pool.execute('SELECT * FROM gallery_posts');
    if (galleryRow.length === 0) {
      const gallery = [
        { id: 'gal-001', title: 'Balayage Masterpiece', caption: 'Stunning gold balayage transformation by Master Stylist Alexander Vance.', media_url: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&q=80&w=800', media_type: 'image' },
        { id: 'gal-002', title: 'Bespoke Beard Architecture', caption: 'Bespoke beard trim & hot towel shave by Marcus Thorne.', media_url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=800', media_type: 'image' },
        { id: 'gal-003', title: 'Caviar Skin Rejuvenation', caption: 'Luxury gold caviar facial therapy session with Elena Rostova.', media_url: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800', media_type: 'image' },
        { id: 'gal-004', title: 'Luxury Salon Experience', caption: 'Step inside Luxe Salon and begin your premium styling journey.', media_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800', media_type: 'image' }
      ];
      for (const g of gallery) {
        await pool.execute(
          'INSERT INTO gallery_posts (id, title, caption, media_url, media_type) VALUES (?, ?, ?, ?, ?)',
          [g.id, g.title, g.caption, g.media_url, g.media_type]
        );
      }
      console.log('🌱 Seeded gallery photos.');
    }

    // 6. Seed site settings
    const [settingsRow] = await pool.execute('SELECT * FROM site_settings');
    if (settingsRow.length === 0) {
      await pool.execute(
        `INSERT INTO site_settings (id, site_name, email, phone, address, maps_link, whatsapp, instagram, facebook, twitter, working_hours, closed_days, closed_slots) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'settings-001',
          'TONI & GUY ESSENSUALS HAIRDRESSING Kondapur',
          'info@luxesalon.com\nbookings@luxesalon.com',
          '+91 98765 43210\n+91 98765 43211',
          '123 Royal Avenue, Bandra West, Mumbai, Maharashtra 400050',
          'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3771.0!2d72.8!3d19.05!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDAzJzAwLjAiTiA3MsKwNDgnMDAuMCJF!5e0!3m2!1sen!2sin!4v1234567890',
          '+919876543210',
          'https://www.instagram.com/toni_and_guy_kondapur?igsh=eXBuZmhrcDNjMW1l',
          '#',
          '#',
          'Monday – Saturday: 9:00 AM – 8:00 PM\nSunday: 10:00 AM – 6:00 PM',
          '[]',
          '[]'
        ]
      );
      console.log('🌱 Seeded site settings.');
    }

  } catch (error) {
    console.error('❌ Failed to initialize PostgreSQL database schema:', error.message);
  }
}

module.exports = {
  pool,
  testConnection,
  get usePostgres() { return true; },
  get useMysql() { return false; },
  get useSqlite() { return false; }
};