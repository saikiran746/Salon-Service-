-- ============================================
-- LUXE SALON - SEED DATA
-- Run AFTER schema.sql
-- ============================================
USE salon_db;

-- ==================== ADMIN USER ====================
-- Password: Admin@123456 (bcrypt hash)
INSERT INTO users (id, name, email, phone, password, role) VALUES
('admin-001', 'Salon Admin', 'admin@luxesalon.com', '+919876543210',
 '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFHHcJFpSVg.v8G', 'super_admin');

-- ==================== MEMBERSHIP PLANS ====================
INSERT INTO membership_plans (id, name, description, price, validity_days, discount, benefits) VALUES
('mem-001', 'Silver', 'Perfect for occasional visits. Enjoy exclusive discounts and priority booking.', 1999.00, 180, 10.00,
 '["10% discount on all services", "Priority booking", "Complimentary consultation", "Birthday special offer"]'),
('mem-002', 'Gold', 'Our most popular plan. Premium benefits for regular salon visits.', 3499.00, 365, 20.00,
 '["20% discount on all services", "Priority booking", "Free consultation", "2 complimentary hair treatments", "Birthday month special", "Exclusive member events"]'),
('mem-003', 'Platinum', 'The ultimate luxury experience. Unlimited premium perks all year.', 5999.00, 365, 30.00,
 '["30% discount on all services", "VIP priority booking", "Free consultation & analysis", "4 complimentary treatments", "Dedicated stylist", "Birthday week special", "Home visit option", "Exclusive lounge access"]');

-- ==================== SERVICES ====================
INSERT INTO services (id, name, description, duration, price, specialist_type, category, sort_order) VALUES
('svc-001', 'Signature Haircut', 'Expert cut tailored to your face shape, lifestyle and preferences. Includes wash, cut, blow-dry and styling.', 60, 800.00, 'haircut', 'hair', 1),
('svc-002', 'Beard Styling & Grooming', 'Precision beard shaping, trimming, hot towel treatment and premium grooming products.', 45, 500.00, 'beard', 'grooming', 2),
('svc-003', 'Luxury Hair Spa', 'Deep conditioning treatment with premium serums to restore shine, strength and vitality to your hair.', 90, 1500.00, 'hair_spa', 'hair', 3),
('svc-004', 'Gold Facial', 'Rejuvenating gold-infused facial treatment that brightens, firms and hydrates your skin.', 75, 2000.00, 'facial', 'skin', 4),
('svc-005', 'Hair Coloring - Global', 'Full head professional hair coloring using premium ammonia-free colors with conditioning treatment.', 150, 3500.00, 'hair_color', 'hair', 5),
('svc-006', 'Highlights & Balayage', 'Natural-looking highlights or trendy balayage done by expert colorists for a sun-kissed look.', 180, 4500.00, 'hair_color', 'hair', 6),
('svc-007', 'Keratin Treatment', 'Salon-grade keratin smoothing treatment for frizz-free, glossy hair lasting up to 3 months.', 180, 5000.00, 'hair_spa', 'hair', 7),
('svc-008', 'Classic Manicure', 'Relaxing hand soak, nail shaping, cuticle care and premium polish application.', 45, 600.00, 'nail', 'beauty', 8),
('svc-009', 'Classic Pedicure', 'Foot soak, scrub, nail care, callus removal and polish for refreshed, beautiful feet.', 60, 800.00, 'nail', 'beauty', 9),
('svc-010', 'Men\'s Skin Boost Facial', 'Deep cleanse, exfoliation and hydration facial specially formulated for men\'s skin.', 60, 1200.00, 'facial', 'skin', 10);

-- ==================== STAFF ====================
INSERT INTO staff (id, name, email, phone, experience, specializations, bio, rating, review_count) VALUES
('stf-001', 'Arjun Sharma', 'arjun@luxesalon.com', '+919811111111', '8 years',
 'haircut,beard', 'Master barber trained at TONI&GUY London. Specializes in precision cuts and creative beard styling. Known for his attention to detail and ability to transform any look.', 4.9, 127),
('stf-002', 'Priya Kapoor', 'priya@luxesalon.com', '+919822222222', '10 years',
 'hair_color,highlights,balayage', 'Senior colorist with expertise in global color, balayage and creative techniques. Trained with L\'Oréal Professionnel Paris. Creates stunning, personalized color stories.', 4.8, 203),
('stf-003', 'Rohit Verma', 'rohit@luxesalon.com', '+919833333333', '6 years',
 'hair_spa,keratin,haircut', 'Hair care specialist with deep knowledge of trichology and hair restoration. Expert in keratin treatments, hair spa and scalp therapies.', 4.7, 89),
('stf-004', 'Sneha Patel', 'sneha@luxesalon.com', '+919844444444', '7 years',
 'facial,nail,beauty', 'Certified skin care specialist and beauty therapist. Trained in advanced facial techniques and nail artistry. Known for luxurious and relaxing treatment experiences.', 4.8, 156),
('stf-005', 'Karan Mehta', 'karan@luxesalon.com', '+919855555555', '5 years',
 'haircut,beard,hair_spa', 'Rising star stylist known for contemporary cuts and men\'s grooming expertise. Passionate about creating looks that boost confidence.', 4.6, 74);

-- ==================== SAMPLE CUSTOMERS ====================
-- Password for all sample customers: Customer@123
INSERT INTO users (id, name, email, phone, password, role) VALUES
('usr-001', 'Rahul Gupta', 'rahul@example.com', '+919711111111', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFHHcJFpSVg.v8G', 'customer'),
('usr-002', 'Anita Desai', 'anita@example.com', '+919722222222', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFHHcJFpSVg.v8G', 'customer'),
('usr-003', 'Vikram Singh', 'vikram@example.com', '+919733333333', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFHHcJFpSVg.v8G', 'customer');

INSERT INTO customers (id, user_id, name, email, phone, total_visits, total_spent, last_visit, membership_id) VALUES
('cust-001', 'usr-001', 'Rahul Gupta', 'rahul@example.com', '+919711111111', 8, 12500.00, DATE_SUB(NOW(), INTERVAL 5 DAY), 'mem-002'),
('cust-002', 'usr-002', 'Anita Desai', 'anita@example.com', '+919722222222', 15, 28000.00, DATE_SUB(NOW(), INTERVAL 45 DAY), 'mem-003'),
('cust-003', 'usr-003', 'Vikram Singh', 'vikram@example.com', '+919733333333', 3, 4200.00, DATE_SUB(NOW(), INTERVAL 12 DAY), NULL);

-- Update membership
UPDATE customers SET membership_id = 'mem-002' WHERE id = 'cust-001';
UPDATE customers SET membership_id = 'mem-003' WHERE id = 'cust-002';

-- ==================== SAMPLE APPOINTMENTS ====================
INSERT INTO appointments (id, customer_id, service_id, staff_id, appointment_date, appointment_time, duration, price, status, source) VALUES
('apt-001', 'cust-001', 'svc-001', 'stf-001', CURDATE(), '10:00:00', 60, 800.00, 'confirmed', 'online'),
('apt-002', 'cust-002', 'svc-005', 'stf-002', CURDATE(), '11:30:00', 150, 3500.00, 'confirmed', 'online'),
('apt-003', 'cust-003', 'svc-002', 'stf-001', CURDATE(), '14:00:00', 45, 500.00, 'confirmed', 'walk_in'),
('apt-004', 'cust-001', 'svc-003', 'stf-003', DATE_SUB(CURDATE(), INTERVAL 5 DAY), '15:00:00', 90, 1500.00, 'completed', 'online'),
('apt-005', 'cust-002', 'svc-004', 'stf-004', DATE_SUB(CURDATE(), INTERVAL 10 DAY), '12:00:00', 75, 2000.00, 'completed', 'online');

-- ==================== SAMPLE BILLS ====================
INSERT INTO bills (id, invoice_number, appointment_id, customer_id, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total_amount, payment_method, status) VALUES
('bill-001', 'INV-202401-1001', 'apt-004', 'cust-001', 1500.00, 20.00, 300.00, 18.00, 216.00, 1416.00, 'card', 'paid'),
('bill-002', 'INV-202401-1002', 'apt-005', 'cust-002', 2000.00, 30.00, 600.00, 18.00, 252.00, 1652.00, 'upi', 'paid');

INSERT INTO bill_items (id, bill_id, description, quantity, unit_price, total_price) VALUES
(UUID(), 'bill-001', 'Luxury Hair Spa', 1, 1500.00, 1500.00),
(UUID(), 'bill-002', 'Gold Facial', 1, 2000.00, 2000.00);

-- ==================== GALLERY POSTS ====================
INSERT INTO gallery_posts (id, title, caption, media_url, media_type, tags, is_published) VALUES
('gal-001', 'Summer Balayage', 'Sun-kissed highlights that turn heads. Book your color session today!', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800', 'image', 'balayage,color,summer', 1),
('gal-002', 'Precision Beard Art', 'Master craftsmanship meets modern style.', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', 'image', 'beard,grooming,men', 1),
('gal-003', 'Luxury Spa Experience', 'Because your hair deserves the best.', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800', 'image', 'spa,treatment,luxury', 1),
('gal-004', 'Bridal Glam', 'Perfect looks for your perfect day.', 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800', 'image', 'bridal,makeup,wedding', 1);

-- ==================== EMAIL TEMPLATES ====================
INSERT INTO email_templates (id, name, subject, body, trigger_days) VALUES
('tmpl-001', '30-Day Win-Back', 'We miss you, {{name}}!', 'Dear {{name}}, it has been 30 days since your last visit. We would love to welcome you back. Book now and enjoy a special offer!', 30),
('tmpl-002', '60-Day Win-Back', 'Come back to Luxe Salon, {{name}}', 'Dear {{name}}, we have not seen you in 2 months! Your style awaits. Book now for 10% off your next visit.', 60),
('tmpl-003', '90-Day Win-Back', 'Special offer for you, {{name}}', 'Dear {{name}}, it has been 3 months. We miss you! Come back and enjoy 15% off your next visit with code WELCOME15.', 90);

-- ==================== LEADS ====================
INSERT INTO leads (id, name, email, phone, source, page_visited, status) VALUES
(UUID(), 'Priya Sharma', 'priya.s@example.com', '+919876500001', 'website', '/services', 'new'),
(UUID(), 'Amit Kumar', 'amit.k@example.com', '+919876500002', 'instagram', '/book', 'contacted'),
(UUID(), 'Neha Joshi', 'neha.j@example.com', '+919876500003', 'google', '/memberships', 'new');

COMMIT;

SELECT 'Seed data inserted successfully!' AS message;
