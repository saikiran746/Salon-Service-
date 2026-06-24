const { pool, testConnection } = require('../config/database');

const tables = [
  // 1. Users
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'customer',
    is_active SMALLINT DEFAULT 1,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // 2. Customers
  `CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20) DEFAULT 'female',
    address TEXT,
    notes TEXT,
    source VARCHAR(20) DEFAULT 'online',
    membership_id VARCHAR(36),
    membership_expiry DATE,
    total_visits INT DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0.00,
    last_visit TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // 3. Password Resets
  `CREATE TABLE IF NOT EXISTS password_resets (
    user_id VARCHAR(36) PRIMARY KEY,
    token VARCHAR(36) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // 4. Services
  `CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    specialist_type VARCHAR(100),
    category VARCHAR(100) DEFAULT 'general',
    image VARCHAR(500),
    image_public_id VARCHAR(200),
    sort_order INT DEFAULT 0,
    is_active SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // 5. Staff
  `CREATE TABLE IF NOT EXISTS staff (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20),
    experience VARCHAR(50),
    specializations TEXT,
    bio TEXT,
    photo VARCHAR(500),
    photo_public_id VARCHAR(200),
    rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    total_clients INT DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    is_active SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // 6. Membership Plans
  `CREATE TABLE IF NOT EXISTS membership_plans (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    validity_days INT NOT NULL DEFAULT 365,
    discount DECIMAL(5,2) DEFAULT 0.00,
    benefits JSON,
    is_active SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // 7. Membership Purchases
  `CREATE TABLE IF NOT EXISTS membership_purchases (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) NOT NULL,
    plan_id VARCHAR(36) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'online',
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATE NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES membership_plans(id)
  )`,

  // 8. Appointments
  `CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36),
    service_id VARCHAR(36) NOT NULL,
    staff_id VARCHAR(36) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration INT,
    price DECIMAL(10,2),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'confirmed',
    source VARCHAR(20) DEFAULT 'online',
    bill_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (staff_id) REFERENCES staff(id)
  )`,

  // 9. Bills
  `CREATE TABLE IF NOT EXISTS bills (
    id VARCHAR(36) PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    appointment_id VARCHAR(36),
    customer_id VARCHAR(36),
    subtotal DECIMAL(12,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 18.00,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'cash',
    status VARCHAR(20) DEFAULT 'paid',
    pdf_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
  )`,

  // 10. Bill Items
  `CREATE TABLE IF NOT EXISTS bill_items (
    id VARCHAR(36) PRIMARY KEY,
    bill_id VARCHAR(36) NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
  )`,

  // 11. Reviews
  `CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(36) PRIMARY KEY,
    staff_id VARCHAR(36) NOT NULL,
    customer_id VARCHAR(36) NOT NULL,
    appointment_id VARCHAR(36) UNIQUE NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  )`,

  // 12. Gallery Posts
  `CREATE TABLE IF NOT EXISTS gallery_posts (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(200),
    caption TEXT,
    category VARCHAR(50) DEFAULT 'Photos',
    media_url VARCHAR(500) NOT NULL,
    media_public_id VARCHAR(200),
    media_type VARCHAR(20) DEFAULT 'image',
    tags VARCHAR(500),
    is_before_after SMALLINT DEFAULT 0,
    is_published SMALLINT DEFAULT 1,
    likes_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // 13. Leads
  `CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20),
    source VARCHAR(20) DEFAULT 'website',
    page_visited VARCHAR(200),
    status VARCHAR(20) DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // 14. Email Templates
  `CREATE TABLE IF NOT EXISTS email_templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    trigger_days INT,
    is_active SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // 15. Email Campaigns
  `CREATE TABLE IF NOT EXISTS email_campaigns (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36),
    subject VARCHAR(200),
    body TEXT,
    recipients_count INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // 16. Email Sent Log
  `CREATE TABLE IF NOT EXISTS email_sent_log (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    days_trigger INT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // 17. Notifications
  `CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type VARCHAR(20) DEFAULT 'system',
    is_read SMALLINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`
];

const indexes = [
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_membership ON customers(membership_id)`,
  `CREATE INDEX IF NOT EXISTS idx_services_category ON services(category)`,
  `CREATE INDEX IF NOT EXISTS idx_services_specialist ON services(specialist_type)`,
  `CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_staff_rating ON staff(rating)`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_staff ON appointments(staff_id)`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)`,
  `CREATE INDEX IF NOT EXISTS idx_bills_customer ON bills(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bills_invoice ON bills(invoice_number)`,
  `CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_staff ON reviews(staff_id)`,
  `CREATE INDEX IF NOT EXISTS idx_gallery_posts_type ON gallery_posts(media_type)`,
  `CREATE INDEX IF NOT EXISTS idx_gallery_posts_published ON gallery_posts(is_published)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email)`,
  `CREATE INDEX IF NOT EXISTS idx_email_campaigns_created ON email_campaigns(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_email_sent_log_customer_type ON email_sent_log(customer_id, type)`,
  `CREATE INDEX IF NOT EXISTS idx_email_sent_log_sent ON email_sent_log(sent_at)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)`
];

const foreignKeys = [
  `ALTER TABLE customers ADD CONSTRAINT fk_customers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`,
  `ALTER TABLE customers ADD CONSTRAINT fk_customers_membership FOREIGN KEY (membership_id) REFERENCES membership_plans(id) ON DELETE SET NULL`
];

async function initialize() {
  await testConnection();
  console.log('🔄 Initializing PostgreSQL database for Luxe Salon...');

  // 1. Drop existing mismatching users table from old database
  console.log('🗑 Dropping mismatching users table if it exists...');
  await pool.query('DROP TABLE IF EXISTS users CASCADE');

  // 2. Create tables
  for (const tableSql of tables) {
    const tableName = tableSql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
    console.log(`⏳ Creating table ${tableName}...`);
    await pool.query(tableSql);
  }
  console.log('✅ All tables created.');

  // 3. Create indexes
  console.log('⏳ Creating indexes...');
  for (const indexSql of indexes) {
    await pool.query(indexSql);
  }
  console.log('✅ All indexes created.');

  // 4. Create foreign keys
  console.log('⏳ Creating foreign key constraints...');
  for (const fkSql of foreignKeys) {
    try {
      await pool.query(fkSql);
    } catch (e) {
      if (e.code === '42710') {
        console.log('ℹ️ Foreign key constraint already exists.');
      } else {
        throw e;
      }
    }
  }
  console.log('✅ Foreign key constraints created.');

  console.log('\n🎉 PostgreSQL database initialization complete!');
  process.exit(0);
}

initialize().catch(err => {
  console.error('❌ Database initialization failed:', err);
  process.exit(1);
});
