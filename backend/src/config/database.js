const mysql = require('mysql2/promise');
const { Pool: PgPool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

let activePool = null;
let activeDriver = null; // 'postgres', 'mysql', 'sqlite'

// Stable database proxy matching mysql2/pg pool signatures
const pool = {
  execute: async (query, params = []) => {
    if (!activePool) {
      throw new Error("Database connection pool is not initialized yet.");
    }
    return activePool.execute(query, params);
  },
  query: async (query, params = []) => {
    if (!activePool) {
      throw new Error("Database connection pool is not initialized yet.");
    }
    // If activePool has a query method, use it; otherwise fallback to execute
    return activePool.query ? activePool.query(query, params) : activePool.execute(query, params);
  }
};

function convertPlaceholders(query) {
  let index = 1;
  return query.replace(/\?/g, () => `$${index++}`);
}

async function testConnection() {
  // 1. Try PostgreSQL (Neon Cloud) if DATABASE_URL is configured
  if (process.env.DATABASE_URL) {
    try {
      console.log('🔌 Testing connection to PostgreSQL Cloud Database...');
      const pgPoolTemp = new PgPool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000, // Increased timeout to wait for Neon wakeup
      });
      const client = await pgPoolTemp.connect();
      client.release();
      await pgPoolTemp.end();

      // Configure PostgreSQL as the active driver
      activeDriver = 'postgres';
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

      // ── Auto-migrate: create any missing tables in the PostgreSQL schema ──
      try {
        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS staff_shifts (
            id TEXT PRIMARY KEY,
            staff_id TEXT NOT NULL,
            date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            break_start TEXT,
            break_duration INTEGER DEFAULT 0,
            is_off INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS staff_leaves (
            id TEXT PRIMARY KEY,
            staff_id TEXT NOT NULL,
            type TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            reason TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS staff_attendance (
            id TEXT PRIMARY KEY,
            staff_id TEXT NOT NULL,
            date TEXT NOT NULL,
            check_in TEXT,
            check_out TEXT,
            total_hours REAL DEFAULT 0.00,
            status TEXT DEFAULT 'present',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS admin_logins (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            ip_address TEXT,
            device_type TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS cleared_notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info',
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
            id VARCHAR(255) PRIMARY KEY,
            campaign_name VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            recipient_count INTEGER NOT NULL,
            sent_count INTEGER NOT NULL,
            failed_count INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS campaign_histories (
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
          );
          CREATE TABLE IF NOT EXISTS campaign_recipients (
            id VARCHAR(255) PRIMARY KEY,
            campaign_id VARCHAR(255) NOT NULL,
            customer_id VARCHAR(255),
            phone VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'PENDING',
            error_message TEXT,
            sent_at TIMESTAMP NULL
          );
        `);
        await pgPool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_cleared BOOLEAN DEFAULT FALSE;').catch(() => {});
        await pgPool.query('ALTER TABLE appointments ALTER COLUMN staff_id DROP NOT NULL;').catch(() => {});
        await pgPool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_ids TEXT;').catch(() => {});
        await pgPool.query('ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0;').catch(() => {});
        await pgPool.query('ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS final_amount NUMERIC;').catch(() => {});
        await pgPool.query('UPDATE bill_items SET final_amount = total_price WHERE final_amount IS NULL;').catch(() => {});
        await pgPool.query('CREATE UNIQUE INDEX idx_unique_appt ON appointments (customer_id, appointment_date, appointment_time, service_id);').catch(() => {});
        console.log('✅ PostgreSQL schedule tables ensured (staff_shifts, staff_leaves, staff_attendance, admin_logins, cleared_notifications)');
      } catch (migErr) {
        console.warn('⚠️ Migration warning:', migErr.message);
      }

      return;

    } catch (error) {
      console.warn('⚠️ PostgreSQL Cloud DB failed:', error.message);
      console.log('🔌 Attempting local MySQL database fallback...');
    }
  }

  // 2. Try MySQL (Local Service) if configured
  const mysqlConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'salon_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  };

  try {
    console.log('🔌 Testing connection to local MySQL service...');
    const conn = await mysql.createConnection({
      ...mysqlConfig,
      connectTimeout: 3000,
    });
    await conn.end();

    // Configure MySQL as the active driver
    activeDriver = 'mysql';
    activePool = mysql.createPool({
      ...mysqlConfig,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      timezone: '+00:00',
    });

    console.log('✅ MySQL connected successfully');
    await activePool.execute('ALTER TABLE appointments ADD COLUMN service_ids TEXT').catch(() => {});
    await activePool.execute('ALTER TABLE appointments MODIFY staff_id VARCHAR(36) NULL').catch(() => {});
    await activePool.execute('CREATE UNIQUE INDEX idx_unique_appt ON appointments (customer_id, appointment_date, appointment_time, service_id)').catch(() => {});
    return;
  } catch (error) {
    console.warn('⚠️ Local MySQL service failed:', error.message);
    console.log('🔌 Falling back to local, zero-dependency SQLite database...');
  }

  // 3. Graceful Fallback: Local SQLite File Database (Offline-Proof!)
  activeDriver = 'sqlite';
  const dbPath = path.resolve(__dirname, '../../database.sqlite');
  console.log(`🔌 Initializing offline local SQLite database at: ${dbPath}`);

  const sqliteDb = new sqlite3.Database(dbPath);

  // Wrapper mimicking the mysql2/promise `pool` API signature
  const sqlitePool = {
    execute: (query, params = []) => {
      return new Promise((resolve, reject) => {
        const cleanedQuery = query.trim();
        const isSelect = cleanedQuery.toUpperCase().startsWith('SELECT');
        
        // SQLite doesn't natively support "NOW()" or "CURRENT_TIMESTAMP ON UPDATE"
        // We replace "NOW()" with "datetime('now')" in standard SQLite queries
        let formattedQuery = cleanedQuery.replace(/\bNOW\(\)/gi, "datetime('now')");
        
        // Handle MySQL CURDATE() -> SQLite date('now')
        formattedQuery = formattedQuery.replace(/\bCURDATE\(\)/gi, "date('now')");
        
        // Handle MySQL DATE_SUB(CURDATE(), INTERVAL x DAY) -> SQLite date('now', '-x days')
        formattedQuery = formattedQuery.replace(/DATE_SUB\(CURDATE\(\),\s*INTERVAL\s+(\d+|\?)\s+DAY\)/gi, "date('now', '-$1 days')");
        formattedQuery = formattedQuery.replace(/DATE_SUB\(CURDATE\(\),\s*INTERVAL\s+(\d+|\?)\s+MONTH\)/gi, "date('now', '-$1 months')");
        
        // Handle MySQL DATE_ADD(CURDATE(), INTERVAL x DAY) -> SQLite date('now', '+$1 days')
        formattedQuery = formattedQuery.replace(/DATE_ADD\(CURDATE\(\),\s*INTERVAL\s+(\d+|\?)\s+DAY\)/gi, "date('now', '+$1 days')");
        
        if (isSelect) {
          sqliteDb.all(formattedQuery, params, (err, rows) => {
            if (err) {
              console.error('SQLite SELECT Error:', err.message, '\nQuery:', formattedQuery);
              reject(err);
            } else {
              resolve([rows, { rows }]);
            }
          });
        } else {
          sqliteDb.run(formattedQuery, params, function(err) {
            if (err) {
              console.error('SQLite WRITE Error:', err.message, '\nQuery:', formattedQuery);
              reject(err);
            } else {
              resolve([[], { lastID: this.lastID, changes: this.changes }]);
            }
          });
        }
      });
    },
    query: (query, params = []) => sqlitePool.execute(query, params)
  };

  activePool = sqlitePool;

  // Run SQLite table initializer and seed
  await initializeSqliteSchema(sqliteDb);
  console.log('✅ SQLite database initialized and seeded successfully!');
}

async function initializeSqliteSchema(db) {
  const runQuery = (q) => {
    return new Promise((resolve, reject) => {
      db.run(q, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  try {
    // 17 Tables in SQLite friendly syntax
    await runQuery(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'customer',
      is_active INTEGER DEFAULT 1,
      last_login TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      date_of_birth TEXT,
      gender TEXT,
      address TEXT,
      notes TEXT,
      source TEXT DEFAULT 'online',
      membership_id TEXT,
      membership_expiry TEXT,
      total_visits INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0.00,
      last_visit TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS password_resets (
      user_id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      otp TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      duration INTEGER NOT NULL,
      price REAL NOT NULL,
      specialist_type TEXT,
      category TEXT DEFAULT 'general',
      image TEXT,
      image_public_id TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      gender TEXT,
      experience TEXT,
      specializations TEXT,
      bio TEXT,
      photo TEXT,
      photo_public_id TEXT,
      rating REAL DEFAULT 0.00,
      review_count INTEGER DEFAULT 0,
      total_clients INTEGER DEFAULT 0,
      total_revenue REAL DEFAULT 0.00,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS membership_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      validity_days INTEGER NOT NULL DEFAULT 365,
      discount REAL DEFAULT 0.00,
      benefits TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS membership_purchases (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'online',
      purchased_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      service_id TEXT NOT NULL,
      staff_id TEXT,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      duration INTEGER,
      price REAL,
      notes TEXT,
      status TEXT DEFAULT 'confirmed',
      source TEXT DEFAULT 'online',
      bill_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      appointment_id TEXT,
      customer_id TEXT,
      subtotal REAL NOT NULL,
      discount_percent REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_percent REAL DEFAULT 18.00,
      tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      status TEXT DEFAULT 'paid',
      pdf_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS bill_items (
      id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL,
      description TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      appointment_id TEXT UNIQUE NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS gallery_posts (
      id TEXT PRIMARY KEY,
      title TEXT,
      caption TEXT,
      media_url TEXT NOT NULL,
      media_public_id TEXT,
      media_type TEXT DEFAULT 'image',
      tags TEXT,
      category TEXT DEFAULT 'All',
      is_before_after INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      likes_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    await runQuery('ALTER TABLE gallery_posts ADD COLUMN category TEXT DEFAULT \'All\'').catch(() => {});

    await runQuery(`CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      source TEXT DEFAULT 'website',
      page_visited TEXT,
      status TEXT DEFAULT 'new',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS email_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      trigger_days INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS email_campaigns (
      id TEXT PRIMARY KEY,
      template_id TEXT,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      recipients_count INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      customer_id TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT DEFAULT 'delivered',
      error_message TEXT,
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      is_cleared INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    await runQuery('ALTER TABLE notifications ADD COLUMN is_cleared INTEGER DEFAULT 0').catch(() => {});
    await runQuery('ALTER TABLE appointments ADD COLUMN service_ids TEXT').catch(() => {});
    await runQuery('ALTER TABLE bill_items ADD COLUMN discount_percentage REAL DEFAULT 0').catch(() => {});
    await runQuery('ALTER TABLE bill_items ADD COLUMN final_amount REAL').catch(() => {});
    await runQuery('UPDATE bill_items SET final_amount = total_price WHERE final_amount IS NULL').catch(() => {});
    await runQuery(`CREATE TABLE IF NOT EXISTS cleared_notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS staff_shifts (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      break_start TEXT,
      break_duration INTEGER DEFAULT 60,
      is_off INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS staff_leaves (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS staff_attendance (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      total_hours REAL DEFAULT 0.00,
      status TEXT DEFAULT 'present',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS admin_logins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      ip_address TEXT,
      device_type TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS site_settings (
      id TEXT PRIMARY KEY,
      site_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      maps_link TEXT,
      whatsapp TEXT,
      instagram TEXT,
      facebook TEXT,
      twitter TEXT,
      working_hours TEXT,
      closed_days TEXT,
      closed_slots TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
      id TEXT PRIMARY KEY,
      campaign_name TEXT NOT NULL,
      message TEXT NOT NULL,
      recipient_count INTEGER NOT NULL,
      sent_count INTEGER NOT NULL,
      failed_count INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS campaign_histories (
      id TEXT PRIMARY KEY,
      campaign_name TEXT NOT NULL,
      message TEXT NOT NULL,
      total_recipients INTEGER NOT NULL,
      sent_count INTEGER NOT NULL,
      failed_count INTEGER NOT NULL,
      status TEXT DEFAULT 'PENDING',
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      created_by TEXT
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS campaign_recipients (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      customer_id TEXT,
      phone TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      error_message TEXT,
      sent_at TEXT
    )`);

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

    // 4. Seed TONI & GUY Essensuals services from real menu
    const [servicesRow] = await pool.execute('SELECT * FROM services');
    if (servicesRow.length === 0) {
      const services = [];
      for (const s of services) {
        await pool.execute(
          'INSERT INTO services (id, name, description, price, duration, category, image, specialist_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [s.id, s.name, s.description, s.price, s.duration, s.category, s.image, s.type]
        );
      }
      console.log('🌱 Seeded luxury services catalog.');
    }

    // 5. Seed master stylists / specialists
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

    // 6. Seed gallery lightbox posts
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

    // 7. Seed site settings
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

    // Add unique constraint to prevent duplicate bookings across all dialects
    await runQuery('CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_appt ON appointments (customer_id, appointment_date, appointment_time, service_id)').catch(() => {});
  } catch (error) {
    console.error('❌ Failed to initialize SQLite database schema:', error.message);
  }
}

module.exports = {
  pool,
  testConnection,
  get usePostgres() { return activeDriver === 'postgres'; },
  get useMysql() { return activeDriver === 'mysql'; },
  get useSqlite() { return activeDriver === 'sqlite'; }
};
