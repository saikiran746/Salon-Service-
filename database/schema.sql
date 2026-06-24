-- ============================================
-- LUXE SALON MANAGEMENT SYSTEM - DATABASE SCHEMA
-- ============================================

CREATE DATABASE IF NOT EXISTS salon_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE salon_db;

-- ==================== USERS ====================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  role ENUM('customer','admin','super_admin') DEFAULT 'customer',
  is_active TINYINT(1) DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB;

-- ==================== CUSTOMERS ====================
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(20),
  date_of_birth DATE,
  gender ENUM('male','female','other','prefer_not_to_say'),
  address TEXT,
  notes TEXT,
  source ENUM('online','walk_in','referral') DEFAULT 'online',
  membership_id VARCHAR(36),
  membership_expiry DATE,
  total_visits INT DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0.00,
  last_visit DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_membership (membership_id)
) ENGINE=InnoDB;

-- ==================== PASSWORD RESETS ====================
CREATE TABLE IF NOT EXISTS password_resets (
  user_id VARCHAR(36) PRIMARY KEY,
  token VARCHAR(36) UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token)
) ENGINE=InnoDB;

-- ==================== SERVICES ====================
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  duration INT NOT NULL COMMENT 'Duration in minutes',
  price DECIMAL(10,2) NOT NULL,
  specialist_type VARCHAR(100),
  category VARCHAR(100) DEFAULT 'general',
  image VARCHAR(500),
  image_public_id VARCHAR(200),
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_specialist (specialist_type),
  INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- ==================== STAFF ====================
CREATE TABLE IF NOT EXISTS staff (
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
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active),
  INDEX idx_rating (rating)
) ENGINE=InnoDB;

-- ==================== MEMBERSHIP PLANS ====================
CREATE TABLE IF NOT EXISTS membership_plans (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  validity_days INT NOT NULL DEFAULT 365,
  discount DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Percentage discount',
  benefits JSON,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==================== MEMBERSHIP PURCHASES ====================
CREATE TABLE IF NOT EXISTS membership_purchases (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) NOT NULL,
  plan_id VARCHAR(36) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'online',
  purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATE NOT NULL,
  INDEX idx_customer (customer_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES membership_plans(id)
) ENGINE=InnoDB;

-- ==================== APPOINTMENTS ====================
CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36),
  service_id VARCHAR(36) NOT NULL,
  staff_id VARCHAR(36) NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration INT,
  price DECIMAL(10,2),
  notes TEXT,
  status ENUM('pending','confirmed','in_progress','completed','cancelled','no_show') DEFAULT 'confirmed',
  source ENUM('online','walk_in','phone') DEFAULT 'online',
  bill_id VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customer (customer_id),
  INDEX idx_staff (staff_id),
  INDEX idx_date (appointment_date),
  INDEX idx_status (status),
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
) ENGINE=InnoDB;

-- ==================== BILLS ====================
CREATE TABLE IF NOT EXISTS bills (
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
  payment_method ENUM('cash','card','upi','online','wallet') DEFAULT 'cash',
  status ENUM('pending','paid','cancelled','refunded') DEFAULT 'paid',
  pdf_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customer (customer_id),
  INDEX idx_invoice (invoice_number),
  INDEX idx_date (created_at),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==================== BILL ITEMS ====================
CREATE TABLE IF NOT EXISTS bill_items (
  id VARCHAR(36) PRIMARY KEY,
  bill_id VARCHAR(36) NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity INT DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  INDEX idx_bill (bill_id)
) ENGINE=InnoDB;

-- ==================== REVIEWS ====================
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(36) PRIMARY KEY,
  staff_id VARCHAR(36) NOT NULL,
  customer_id VARCHAR(36) NOT NULL,
  appointment_id VARCHAR(36) UNIQUE NOT NULL,
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_staff (staff_id)
) ENGINE=InnoDB;

-- ==================== GALLERY POSTS ====================
CREATE TABLE IF NOT EXISTS gallery_posts (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200),
  caption TEXT,
  category VARCHAR(50) DEFAULT 'Photos',
  media_url VARCHAR(500) NOT NULL,
  media_public_id VARCHAR(200),
  media_type ENUM('image','video') DEFAULT 'image',
  tags VARCHAR(500),
  is_before_after TINYINT(1) DEFAULT 0,
  is_published TINYINT(1) DEFAULT 1,
  likes_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (media_type),
  INDEX idx_published (is_published)
) ENGINE=InnoDB;

-- ==================== LEADS ====================
CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE,
  phone VARCHAR(20),
  source ENUM('website','instagram','google','referral','other') DEFAULT 'website',
  page_visited VARCHAR(200),
  status ENUM('new','contacted','converted','lost','archived') DEFAULT 'new',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- ==================== EMAIL TEMPLATES ====================
CREATE TABLE IF NOT EXISTS email_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  body LONGTEXT NOT NULL,
  trigger_days INT COMMENT '30, 60, 90 days since last visit',
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==================== EMAIL CAMPAIGNS ====================
CREATE TABLE IF NOT EXISTS email_campaigns (
  id VARCHAR(36) PRIMARY KEY,
  template_id VARCHAR(36),
  subject VARCHAR(200),
  body LONGTEXT,
  recipients_count INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ==================== EMAIL SENT LOG ====================
CREATE TABLE IF NOT EXISTS email_sent_log (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  days_trigger INT,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customer_type (customer_id, type),
  INDEX idx_sent (sent_at)
) ENGINE=InnoDB;

-- ==================== NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  type ENUM('appointment','billing','membership','system','marketing') DEFAULT 'system',
  is_read TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_read (is_read)
) ENGINE=InnoDB;

-- Foreign Keys
ALTER TABLE customers ADD CONSTRAINT fk_customers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE customers ADD CONSTRAINT fk_customers_membership FOREIGN KEY (membership_id) REFERENCES membership_plans(id) ON DELETE SET NULL;

-- ==================== SITE SETTINGS ====================
CREATE TABLE IF NOT EXISTS site_settings (
  id VARCHAR(36) PRIMARY KEY,
  site_name VARCHAR(100),
  email VARCHAR(150),
  phone VARCHAR(50),
  address TEXT,
  maps_link TEXT,
  whatsapp VARCHAR(50),
  instagram VARCHAR(200),
  facebook VARCHAR(200),
  twitter VARCHAR(200),
  working_hours TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
