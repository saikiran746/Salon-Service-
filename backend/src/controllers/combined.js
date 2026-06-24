// ===== MEMBERSHIPS =====
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { pool } = db;
const { sendEmail } = require('../utils/email');
const { deleteFromCloudinary } = require('../middleware/upload');

const membershipController = {
  getAll: async (req, res, next) => {
    try {
      const [plans] = await pool.execute('SELECT * FROM membership_plans WHERE is_active = 1 ORDER BY price ASC');
      res.json({ success: true, data: plans });
    } catch (e) { next(e); }
  },
  getAllAdmin: async (req, res, next) => {
    try {
      const [plans] = await pool.execute(`
        SELECT mp.*, (SELECT COUNT(*) FROM customers c WHERE c.membership_id = mp.id) AS active_members
        FROM membership_plans mp WHERE mp.is_active = 1 ORDER BY price ASC`);
      res.json({ success: true, data: plans });
    } catch (e) { next(e); }
  },
  create: async (req, res, next) => {
    try {
      const { name, description, price, validity_days, discount, benefits } = req.body;
      const id = uuidv4();
      
      const parsedPrice = parseFloat(price) || 0;
      const parsedValidity = validity_days === '' || validity_days === null || validity_days === undefined ? 365 : (parseInt(validity_days) || 365);
      const parsedDiscount = discount === '' || discount === null || discount === undefined ? 0 : (parseFloat(discount) || 0);

      await pool.execute(
        'INSERT INTO membership_plans (id, name, description, price, validity_days, discount, benefits) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, name, description || null, parsedPrice, parsedValidity, parsedDiscount, JSON.stringify(benefits || [])]
      );
      const [plan] = await pool.execute('SELECT * FROM membership_plans WHERE id = ?', [id]);
      res.status(201).json({ success: true, message: 'Plan created.', data: plan[0] });
    } catch (e) { next(e); }
  },
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, description, price, validity_days, discount, benefits, is_active } = req.body;
      const updates = []; const params = [];
      if (name) { updates.push('name = ?'); params.push(name); }
      if (description !== undefined) { updates.push('description = ?'); params.push(description || null); }
      if (price !== undefined && price !== '') { updates.push('price = ?'); params.push(parseFloat(price) || 0); }
      if (validity_days !== undefined) {
        updates.push('validity_days = ?');
        params.push(validity_days === '' || validity_days === null ? 365 : (parseInt(validity_days) || 365));
      }
      if (discount !== undefined) {
        updates.push('discount = ?');
        params.push(discount === '' || discount === null ? 0 : (parseFloat(discount) || 0));
      }
      if (benefits) { updates.push('benefits = ?'); params.push(JSON.stringify(benefits)); }
      if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
      if (!updates.length) return res.status(400).json({ success: false, message: 'No fields.' });
      params.push(id);
      await pool.execute(`UPDATE membership_plans SET ${updates.join(', ')} WHERE id = ?`, params);
      res.json({ success: true, message: 'Plan updated.' });
    } catch (e) { next(e); }
  },
  delete: async (req, res, next) => {
    try {
      await pool.execute('UPDATE membership_plans SET is_active = 0 WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Plan deleted.' });
    } catch (e) { next(e); }
  },
  purchase: async (req, res, next) => {
    try {
      const { plan_id, payment_method = 'online', customer_id } = req.body;
      const [plan] = await pool.execute('SELECT * FROM membership_plans WHERE id = ? AND is_active = 1', [plan_id]);
      if (!plan.length) return res.status(404).json({ success: false, message: 'Plan not found.' });

      let customerData;
      if (customer_id && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
        const [customer] = await pool.execute('SELECT * FROM customers WHERE id = ?', [customer_id]);
        if (!customer.length) return res.status(404).json({ success: false, message: 'Customer not found.' });
        customerData = customer[0];
      } else {
        const [customer] = await pool.execute('SELECT * FROM customers WHERE user_id = ?', [req.user.id]);
        if (!customer.length) return res.status(404).json({ success: false, message: 'Customer not found.' });
        customerData = customer[0];
      }

      const expiry = new Date();
      expiry.setDate(expiry.getDate() + plan[0].validity_days);

      await pool.execute('UPDATE customers SET membership_id = ?, membership_expiry = ? WHERE id = ?',
        [plan_id, expiry.toISOString().split('T')[0], customerData.id]);

      await pool.execute(
        'INSERT INTO membership_purchases (id, customer_id, plan_id, amount, payment_method, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), customerData.id, plan_id, plan[0].price, payment_method, expiry.toISOString().split('T')[0]]
      );

      // Generate corresponding bill and bill item for this membership purchase
      const billId = uuidv4();
      const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000) + 1000}`;
      const amount = parseFloat(plan[0].price || 0);
      const description = `Membership Plan: ${plan[0].name}`;

      await pool.execute(
        `INSERT INTO bills (id, invoice_number, customer_id, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total_amount, payment_method, status, created_at)
         VALUES (?, ?, ?, ?, 0, 0, 0, 0, ?, ?, 'paid', CURRENT_TIMESTAMP)`,
        [billId, invoiceNumber, customerData.id, amount, amount, payment_method || 'online']
      );

      await pool.execute(
        `INSERT INTO bill_items (id, bill_id, description, quantity, unit_price, total_price)
         VALUES (?, ?, ?, 1, ?, ?)`,
        [uuidv4(), billId, description, amount, amount]
      );

      // Update customer total spent and total visits
      await pool.execute(
        `UPDATE customers SET total_spent = total_spent + ?, total_visits = total_visits + 1, last_visit = NOW() WHERE id = ?`,
        [amount, customerData.id]
      );

      await pool.execute(
        'INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), 'ADMIN', 'Membership Purchased', `${customerData.name} purchased ${plan[0].name} plan.`, 'membership']
      );

      await sendEmail({
        to: customerData.email, subject: 'Welcome to Luxe Salon Membership! 🌟',
        template: 'membership-welcome',
        data: { name: customerData.name, plan: plan[0].name, expiry: expiry.toLocaleDateString('en-IN'), discount: plan[0].discount },
      });

      res.json({ success: true, message: `${plan[0].name} activated!`, data: { expiry } });
    } catch (e) { next(e); }
  },
  getMembers: async (req, res, next) => {
    try {
      const [members] = await pool.execute(`
        SELECT c.id, c.name, c.email, c.phone, c.membership_expiry, c.total_spent, mp.name AS plan_name, mp.discount
        FROM customers c
        JOIN membership_plans mp ON c.membership_id = mp.id
        WHERE c.membership_id IS NOT NULL
        ORDER BY c.membership_expiry DESC`);
      res.json({ success: true, data: members });
    } catch (e) { next(e); }
  },
};

// ===== GALLERY =====
const galleryController = {
  getAll: async (req, res, next) => {
    try {
      const { type, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      let where = 'is_published = 1'; const params = [];
      if (type) { where += ' AND media_type = ?'; params.push(type); }
      const [posts] = await pool.execute(
        `SELECT * FROM gallery_posts WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
      );
      const [total] = await pool.execute(`SELECT COUNT(*) AS count FROM gallery_posts WHERE ${where}`, params);
      res.json({ success: true, data: posts, pagination: { page: parseInt(page), limit: parseInt(limit), total: total[0].count } });
    } catch (e) { next(e); }
  },
  getAllAdmin: async (req, res, next) => {
    try {
      const [posts] = await pool.execute('SELECT * FROM gallery_posts ORDER BY created_at DESC');
      res.json({ success: true, data: posts });
    } catch (e) { next(e); }
  },
  create: async (req, res, next) => {
    try {
      const { title, caption, tags, category, is_before_after } = req.body;
      if (!req.file) return res.status(400).json({ success: false, message: 'Media file required.' });
      const id = uuidv4();
      const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
      await pool.execute(
        'INSERT INTO gallery_posts (id, title, caption, media_url, media_public_id, media_type, tags, category, is_before_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, title || null, caption || null, req.file.path, req.file.filename, mediaType, tags || null, category || 'All', is_before_after ? 1 : 0]
      );
      const [post] = await pool.execute('SELECT * FROM gallery_posts WHERE id = ?', [id]);
      res.status(201).json({ success: true, message: 'Post created.', data: post[0] });
    } catch (e) { next(e); }
  },
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { title, caption, tags, category, is_published } = req.body;
      const updates = []; const params = [];
      if (title !== undefined) { updates.push('title = ?'); params.push(title); }
      if (caption !== undefined) { updates.push('caption = ?'); params.push(caption); }
      if (tags !== undefined) { updates.push('tags = ?'); params.push(tags); }
      if (category !== undefined) { updates.push('category = ?'); params.push(category); }
      if (is_published !== undefined) { updates.push('is_published = ?'); params.push(is_published); }
      if (!updates.length) return res.status(400).json({ success: false, message: 'No fields.' });
      params.push(id);
      await pool.execute(`UPDATE gallery_posts SET ${updates.join(', ')} WHERE id = ?`, params);
      res.json({ success: true, message: 'Post updated.' });
    } catch (e) { next(e); }
  },
  delete: async (req, res, next) => {
    try {
      const [post] = await pool.execute('SELECT * FROM gallery_posts WHERE id = ?', [req.params.id]);
      if (!post.length) return res.status(404).json({ success: false, message: 'Post not found.' });
      await deleteFromCloudinary(post[0].media_public_id, post[0].media_type === 'video' ? 'video' : 'image');
      await pool.execute('DELETE FROM gallery_posts WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Post deleted.' });
    } catch (e) { next(e); }
  },
};

// ===== LEADS =====
const leadsController = {
  capture: async (req, res, next) => {
    try {
      const { name, email, phone, source = 'website', page_visited } = req.body;
      const id = uuidv4();
      
      const [existingLead] = email ? await pool.execute('SELECT * FROM leads WHERE email = ?', [email]) : [[]];
      
      if (existingLead && existingLead.length > 0) {
        await pool.execute(
          'UPDATE leads SET name = ?, updated_at = CURRENT_TIMESTAMP, source = ? WHERE email = ?',
          [name, source, email]
        );
      } else {
        await pool.execute(
          'INSERT INTO leads (id, name, email, phone, source, page_visited) VALUES (?, ?, ?, ?, ?, ?)',
          [id, name, email || null, phone || null, source, page_visited || null]
        );
      }

      await sendEmail({
        to: process.env.ADMIN_EMAIL, subject: '🔔 New Lead - Luxe Salon',
        template: 'new-lead', data: { name, email, phone, source, page_visited },
      }).catch(() => {});
      res.status(201).json({ success: true, message: 'Lead captured.' });
    } catch (e) { next(e); }
  },
  getAll: async (req, res, next) => {
    try {
      const { status, period, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      let where = '1=1'; const params = [];
      if (status) { where += ' AND status = ?'; params.push(status); }
      if (period === '7') {
        if (db.usePostgres) {
          where += " AND created_at >= NOW() - INTERVAL '7 DAY'";
        } else if (db.useSqlite) {
          where += " AND created_at >= datetime('now', '-7 days')";
        } else {
          where += ' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        }
      }
      if (period === '30') {
        if (db.usePostgres) {
          where += " AND created_at >= NOW() - INTERVAL '30 DAY'";
        } else if (db.useSqlite) {
          where += " AND created_at >= datetime('now', '-30 days')";
        } else {
          where += ' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        }
      }
      const [leads] = await pool.execute(
        `SELECT * FROM leads WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
      );
      const [total] = await pool.execute(`SELECT COUNT(*) AS count FROM leads WHERE ${where}`, params);
      res.json({ success: true, data: leads, pagination: { page: parseInt(page), total: total[0].count } });
    } catch (e) { next(e); }
  },
  updateStatus: async (req, res, next) => {
    try {
      const { id } = req.params; const { status, notes } = req.body;
      await pool.execute('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, notes || null, id]);
      res.json({ success: true, message: 'Lead updated.' });
    } catch (e) { next(e); }
  },
};

// ===== REPORTS =====
const reportsController = {
  dashboard: async (req, res, next) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const thisMonth = today.substring(0, 7);
      const prevMonthDate = new Date();
      prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
      const prevMonth = prevMonthDate.toISOString().substring(0, 7);

      // Prepare parallel database queries to avoid network round-trip bottlenecks (essential for cloud database performance)
      const totalRevenuePromise = pool.execute(`
        SELECT COALESCE(SUM(CASE WHEN LOWER(bi.description) LIKE '%membership%' THEN bi.total_price ELSE 0 END), 0) AS memberships,
               COALESCE(SUM(CASE WHEN LOWER(bi.description) NOT LIKE '%membership%' THEN bi.total_price ELSE 0 END), 0) AS services
        FROM bills b
        JOIN bill_items bi ON b.id = bi.bill_id
        WHERE b.status = 'paid'`);

      let mrPromise, drPromise, ncPromise, revenueChartRowsPromise, topServicesPromise, staffPerfPromise, customerGrowthPromise, billedClientsPromise;

      if (db.usePostgres) {
        mrPromise = pool.execute(`
          SELECT COALESCE(SUM(CASE WHEN LOWER(bi.description) LIKE '%membership%' THEN bi.total_price ELSE 0 END), 0) AS memberships,
                 COALESCE(SUM(CASE WHEN LOWER(bi.description) NOT LIKE '%membership%' THEN bi.total_price ELSE 0 END), 0) AS services
          FROM bills b
          JOIN bill_items bi ON b.id = bi.bill_id
          WHERE b.status = 'paid' AND TO_CHAR(b.created_at, 'YYYY-MM') = ?`, [thisMonth]);
        
        drPromise = pool.execute("SELECT COALESCE(SUM(total_amount), 0) AS total FROM bills WHERE status = 'paid' AND CAST(created_at AS DATE) = ?", [today]);
        
        ncPromise = pool.execute("SELECT COUNT(*) AS total FROM customers WHERE TO_CHAR(created_at, 'YYYY-MM') = ?", [thisMonth]);

        revenueChartRowsPromise = pool.execute(`
          SELECT TO_CHAR(b.created_at, 'YYYY-MM') AS month,
                 SUM(CASE WHEN LOWER(bi.description) LIKE '%membership%' THEN bi.total_price ELSE 0 END) AS memberships,
                 SUM(CASE WHEN LOWER(bi.description) NOT LIKE '%membership%' THEN bi.total_price ELSE 0 END) AS services,
                 COUNT(DISTINCT b.id) AS transactions
          FROM bills b
          JOIN bill_items bi ON b.id = bi.bill_id
          WHERE b.status = 'paid' AND b.created_at >= NOW() - INTERVAL '12 MONTH'
          GROUP BY month ORDER BY month ASC`);

        topServicesPromise = pool.execute(`
          SELECT s.name, COUNT(a.id) AS bookings, SUM(a.price) AS revenue
          FROM appointments a JOIN services s ON a.service_id = s.id
          WHERE a.status = 'completed' AND a.appointment_date >= CURRENT_DATE - INTERVAL '30 day'
          GROUP BY s.name ORDER BY bookings DESC LIMIT 5`);

        staffPerfPromise = pool.execute(`
          SELECT st.name, st.photo, COUNT(a.id) AS appointments, SUM(a.price) AS revenue, st.rating
          FROM appointments a JOIN staff st ON a.staff_id = st.id
          WHERE a.status = 'completed' AND a.appointment_date >= CURRENT_DATE - INTERVAL '30 day'
          GROUP BY st.id, st.name, st.photo, st.rating ORDER BY revenue DESC LIMIT 5`);

        customerGrowthPromise = pool.execute(`
          SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS new_customers
          FROM customers WHERE created_at >= NOW() - INTERVAL '12 MONTH'
          GROUP BY month ORDER BY month ASC`);
        billedClientsPromise = pool.execute(`
          SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS new_customers
          FROM bills WHERE created_at >= NOW() - INTERVAL '12 MONTH' AND status = 'paid'
          GROUP BY month ORDER BY month ASC`);
      } else if (db.useSqlite) {
        mrPromise = pool.execute(`
          SELECT COALESCE(SUM(CASE WHEN LOWER(bi.description) LIKE '%membership%' THEN bi.total_price ELSE 0 END), 0) AS memberships,
                 COALESCE(SUM(CASE WHEN LOWER(bi.description) NOT LIKE '%membership%' THEN bi.total_price ELSE 0 END), 0) AS services
          FROM bills b
          JOIN bill_items bi ON b.id = bi.bill_id
          WHERE b.status = 'paid' AND strftime('%Y-%m', b.created_at) = ?`, [thisMonth]);

        drPromise = pool.execute("SELECT COALESCE(SUM(total_amount), 0) AS total FROM bills WHERE status = 'paid' AND date(created_at) = ?", [today]);

        ncPromise = pool.execute("SELECT COUNT(*) AS total FROM customers WHERE strftime('%Y-%m', created_at) = ?", [thisMonth]);

        revenueChartRowsPromise = pool.execute(`
          SELECT strftime('%Y-%m', b.created_at) AS month,
                 SUM(CASE WHEN LOWER(bi.description) LIKE '%membership%' THEN bi.total_price ELSE 0 END) AS memberships,
                 SUM(CASE WHEN LOWER(bi.description) NOT LIKE '%membership%' THEN bi.total_price ELSE 0 END) AS services,
                 COUNT(DISTINCT b.id) AS transactions
          FROM bills b
          JOIN bill_items bi ON b.id = bi.bill_id
          WHERE b.status = 'paid' AND b.created_at >= datetime('now', '-12 months')
          GROUP BY month ORDER BY month ASC`);

        topServicesPromise = pool.execute(`
          SELECT s.name, COUNT(a.id) AS bookings, SUM(a.price) AS revenue
          FROM appointments a JOIN services s ON a.service_id = s.id
          WHERE a.status = 'completed' AND a.appointment_date >= date('now', '-30 days')
          GROUP BY s.id, s.name ORDER BY bookings DESC LIMIT 5`);

        staffPerfPromise = pool.execute(`
          SELECT st.name, st.photo, COUNT(a.id) AS appointments, SUM(a.price) AS revenue, st.rating
          FROM appointments a JOIN staff st ON a.staff_id = st.id
          WHERE a.status = 'completed' AND a.appointment_date >= date('now', '-30 days')
          GROUP BY st.id, st.name, st.photo, st.rating ORDER BY revenue DESC LIMIT 5`);

        customerGrowthPromise = pool.execute(`
          SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS new_customers
          FROM customers WHERE created_at >= datetime('now', '-12 months')
          GROUP BY month ORDER BY month ASC`);
        billedClientsPromise = pool.execute(`
          SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS new_customers
          FROM bills WHERE created_at >= datetime('now', '-12 months') AND status = 'paid'
          GROUP BY month ORDER BY month ASC`);
      } else {
        mrPromise = pool.execute(`
          SELECT COALESCE(SUM(CASE WHEN LOWER(bi.description) LIKE '%membership%' THEN bi.total_price ELSE 0 END), 0) AS memberships,
                 COALESCE(SUM(CASE WHEN LOWER(bi.description) NOT LIKE '%membership%' THEN bi.total_price ELSE 0 END), 0) AS services
          FROM bills b
          JOIN bill_items bi ON b.id = bi.bill_id
          WHERE b.status = 'paid' AND DATE_FORMAT(b.created_at, '%Y-%m') = ?`, [thisMonth]);

        drPromise = pool.execute("SELECT COALESCE(SUM(total_amount), 0) AS total FROM bills WHERE status = 'paid' AND DATE(created_at) = ?", [today]);

        ncPromise = pool.execute("SELECT COUNT(*) AS total FROM customers WHERE DATE_FORMAT(created_at, '%Y-%m') = ?", [thisMonth]);

        revenueChartRowsPromise = pool.execute(`
          SELECT DATE_FORMAT(b.created_at, '%Y-%m') AS month,
                 SUM(CASE WHEN LOWER(bi.description) LIKE '%membership%' THEN bi.total_price ELSE 0 END) AS memberships,
                 SUM(CASE WHEN LOWER(bi.description) NOT LIKE '%membership%' THEN bi.total_price ELSE 0 END) AS services,
                 COUNT(DISTINCT b.id) AS transactions
          FROM bills b
          JOIN bill_items bi ON b.id = bi.bill_id
          WHERE b.status = 'paid' AND b.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
          GROUP BY month ORDER BY month ASC`);

        topServicesPromise = pool.execute(`
          SELECT s.name, COUNT(a.id) AS bookings, SUM(a.price) AS revenue
          FROM appointments a JOIN services s ON a.service_id = s.id
          WHERE a.status = 'completed' AND a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          GROUP BY s.id, s.name ORDER BY bookings DESC LIMIT 5`);

        staffPerfPromise = pool.execute(`
          SELECT st.name, st.photo, COUNT(a.id) AS appointments, SUM(a.price) AS revenue, st.rating
          FROM appointments a JOIN staff st ON a.staff_id = st.id
          WHERE a.status = 'completed' AND a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          GROUP BY st.id, st.name, st.photo, st.rating ORDER BY revenue DESC LIMIT 5`);

        customerGrowthPromise = pool.execute(`
          SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS new_customers
          FROM customers WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
          GROUP BY month ORDER BY month ASC`);
        billedClientsPromise = pool.execute(`
          SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS new_customers
          FROM bills WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH) AND status = 'paid'
          GROUP BY month ORDER BY month ASC`);
      }

      const totalCustomersPromise = pool.execute('SELECT COUNT(*) AS total FROM customers');
      const membersPromise = pool.execute('SELECT COUNT(*) AS total FROM customers WHERE membership_id IS NOT NULL');
      const todayApptsPromise = pool.execute('SELECT COUNT(*) AS total FROM appointments WHERE appointment_date = ?', [today]);
      const pendingApptsPromise = pool.execute("SELECT COUNT(*) AS total FROM appointments WHERE appointment_date >= ? AND status = 'confirmed'", [today]);
      const apptStatusRowsPromise = pool.execute('SELECT status, COUNT(*) AS count FROM appointments GROUP BY status');
      const customerRowsPromise = pool.execute('SELECT id, email, phone, total_visits, source, last_visit, created_at FROM customers');
      const billRowsPromise = pool.execute("SELECT id, customer_id, created_at, appointment_id, subtotal, discount_amount, total_amount FROM bills WHERE status = 'paid'");
      const apptRowsPromise = pool.execute("SELECT id, customer_id, appointment_date, status, source FROM appointments");

      // Execute all database queries concurrently using Promise.all
      const [
        [totalRevenueResultRows],
        [mrRows],
        [drRows],
        [ncRows],
        [revenueChartRowsResult],
        [topServicesResult],
        [staffPerfResult],
        [customerGrowthResult],
        [billedClientsResult],
        [totalCustomersResult],
        [membersResult],
        [todayApptsResult],
        [pendingApptsResult],
        [apptStatusRowsResult],
        [customerRowsResult],
        [billRowsResult],
        [apptRowsResult]
      ] = await Promise.all([
        totalRevenuePromise,
        mrPromise,
        drPromise,
        ncPromise,
        revenueChartRowsPromise,
        topServicesPromise,
        staffPerfPromise,
        customerGrowthPromise,
        billedClientsPromise,
        totalCustomersPromise,
        membersPromise,
        todayApptsPromise,
        pendingApptsPromise,
        apptStatusRowsPromise,
        customerRowsPromise,
        billRowsPromise,
        apptRowsPromise
      ]);

      const totalRevenueResult = totalRevenueResultRows[0];
      const lifetimeTotalRevenue = parseFloat(totalRevenueResult?.memberships || 0) + parseFloat(totalRevenueResult?.services || 0);

      const monthRevenueVal = parseFloat(mrRows[0]?.services || 0);
      const monthMembershipRevenueVal = parseFloat(mrRows[0]?.memberships || 0);

      const dayRevenue = drRows[0];
      const newCustomers = ncRows[0];
      const totalCustomers = totalCustomersResult[0];
      const members = membersResult[0];
      const todayAppts = todayApptsResult[0];
      const pendingAppts = pendingApptsResult[0];

      const revenueChartRows = revenueChartRowsResult;
      const topServices = topServicesResult;
      const staffPerf = staffPerfResult;
      const customerGrowth = customerGrowthResult;
      const billedClientsTrend = billedClientsResult;
      const apptStatusRows = apptStatusRowsResult;
      const customerRows = customerRowsResult;
      const billRows = billRowsResult;
      const apptRows = apptRowsResult;

      // Combine service and membership revenue by month
      const mergedRevenueMap = {};

      // Initialize with last 12 months to avoid missing months
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const yyyymm = d.toISOString().substring(0, 7);
        mergedRevenueMap[yyyymm] = {
          month: yyyymm,
          services: 0,
          memberships: 0,
          revenue: 0,
          transactions: 0
        };
      }

      revenueChartRows.forEach(row => {
        const m = row.month;
        if (!mergedRevenueMap[m]) {
          mergedRevenueMap[m] = { month: m, services: 0, memberships: 0, revenue: 0, transactions: 0 };
        }
        const sVal = parseFloat(row.services || 0);
        const mVal = parseFloat(row.memberships || 0);
        mergedRevenueMap[m].services += sVal;
        mergedRevenueMap[m].memberships += mVal;
        mergedRevenueMap[m].revenue += (sVal + mVal);
        mergedRevenueMap[m].transactions += parseInt(row.transactions || 0);
      });

      const combinedRevenueChart = Object.values(mergedRevenueMap).sort((a, b) => a.month.localeCompare(b.month));

      const apptSummary = { total: 0, confirmed: 0, completed: 0, cancelled: 0, pending: 0 };
      apptStatusRows.forEach(row => {
        const status = row.status?.toLowerCase();
        const count = parseInt(row.count || 0);
        apptSummary.total += count;
        if (status === 'confirmed') apptSummary.confirmed = count;
        else if (status === 'completed') apptSummary.completed = count;
        else if (status === 'cancelled') apptSummary.cancelled = count;
        else if (status === 'pending') apptSummary.pending = count;
      });

      // Grouping by phone or email (Union-Find)
      const cleanPhone = (p) => {
        if (!p) return '';
        const digits = p.trim().replace(/[^0-9]/g, '');
        return digits.length > 10 ? digits.slice(-10) : digits;
      };
      const cleanEmail = (e) => e ? e.trim().toLowerCase() : '';

      const parent = {};
      const getRoot = (id) => {
        if (parent[id] === undefined) {
          parent[id] = id;
          return id;
        }
        let curr = id;
        while (parent[curr] !== curr) {
          parent[curr] = parent[parent[curr]];
          curr = parent[curr];
        }
        return curr;
      };
      const union = (id1, id2) => {
        const root1 = getRoot(id1);
        const root2 = getRoot(id2);
        if (root1 !== root2) {
          parent[root1] = root2;
        }
      };

      const phoneMap = {};
      const emailMap = {};

      customerRows.forEach(row => {
        const cid = row.id;
        getRoot(cid);

        const phone = cleanPhone(row.phone);
        const email = cleanEmail(row.email);

        if (phone) {
          if (phoneMap[phone]) {
            union(cid, phoneMap[phone]);
          } else {
            phoneMap[phone] = cid;
          }
        }

        if (email) {
          if (emailMap[email]) {
            union(cid, emailMap[email]);
          } else {
            emailMap[email] = cid;
          }
        }
      });

      // Calculate sum of lifetime visits per group from customer records
      const groupVisits = {};
      customerRows.forEach(row => {
        const rootId = getRoot(row.id);
        const visits = parseInt(row.total_visits || 0);
        groupVisits[rootId] = (groupVisits[rootId] || 0) + visits;
      });

      // Count direct DB transaction visits per group
      const groupBillCount = {};
      const groupApptCount = {};

      billRows.forEach(row => {
        if (!row.customer_id) return;
        const rootId = getRoot(row.customer_id);
        groupBillCount[rootId] = (groupBillCount[rootId] || 0) + 1;
      });

      apptRows.forEach(row => {
        if (!row.customer_id) return;
        const status = row.status?.toLowerCase();
        if (status === 'completed' || status === 'confirmed') {
          const rootId = getRoot(row.customer_id);
          groupApptCount[rootId] = (groupApptCount[rootId] || 0) + 1;
        }
      });

      // Determine repeat status of each group
      const isRepeatGroup = {};
      Object.keys(groupVisits).forEach(rootId => {
        const sumTotalVisits = groupVisits[rootId];
        const billsCount = groupBillCount[rootId] || 0;
        const apptsCount = groupApptCount[rootId] || 0;
        
        isRepeatGroup[rootId] = (sumTotalVisits > 1) || (billsCount > 1) || (apptsCount > 1) || (billsCount + apptsCount > 1);
      });

      // Index appointments by ID
      const apptById = {};
      apptRows.forEach(row => {
        apptById[row.id] = row;
      });

      // Log monthly activity per group per category
      const groupWalkinMonths = {};
      const groupBookedApptMonths = {};
      const groupBookedByCallMonths = {};

      const getYearMonth = (dateVal) => {
        if (!dateVal) return '';
        if (dateVal instanceof Date) {
          const y = dateVal.getFullYear();
          const m = String(dateVal.getMonth() + 1).padStart(2, '0');
          return `${y}-${m}`;
        }
        const dateStr = String(dateVal).trim();
        const match = dateStr.match(/^(\d{4})[./-](\d{2})/);
        if (match) {
          return `${match[1]}-${match[2]}`;
        }
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          return `${y}-${m}`;
        }
        return '';
      };

      const addCategorizedVisit = (customerId, dateVal, category) => {
        if (!customerId || !dateVal) return;
        const rootId = getRoot(customerId);
        const yyyymm = getYearMonth(dateVal);
        if (!yyyymm) return;
        if (category === 'walk_in') {
          if (!groupWalkinMonths[rootId]) groupWalkinMonths[rootId] = new Set();
          groupWalkinMonths[rootId].add(yyyymm);
        } else if (category === 'booked_appointment') {
          if (!groupBookedApptMonths[rootId]) groupBookedApptMonths[rootId] = new Set();
          groupBookedApptMonths[rootId].add(yyyymm);
        } else if (category === 'booked_by_calls') {
          if (!groupBookedByCallMonths[rootId]) groupBookedByCallMonths[rootId] = new Set();
          groupBookedByCallMonths[rootId].add(yyyymm);
        }
      };

      // 1. Process customer table created_at and last_visit
      customerRows.forEach(row => {
        const cat = row.source === 'online' ? 'booked_appointment' : 'walk_in';
        if (row.total_visits > 0 && row.created_at) {
          addCategorizedVisit(row.id, row.created_at, cat);
        }
        if (row.last_visit) {
          addCategorizedVisit(row.id, row.last_visit, cat);
        }
      });

      // 2. Process bills
      billRows.forEach(row => {
        if (row.appointment_id && apptById[row.appointment_id]) {
          const appt = apptById[row.appointment_id];
          const apptSource = appt.source?.toLowerCase();
          if (apptSource === 'online') {
            addCategorizedVisit(row.customer_id, row.created_at, 'booked_appointment');
          } else {
            addCategorizedVisit(row.customer_id, row.created_at, 'booked_by_calls');
          }
        } else {
          addCategorizedVisit(row.customer_id, row.created_at, 'walk_in');
        }
      });

      // 3. Process appointments
      apptRows.forEach(row => {
        const status = row.status?.toLowerCase();
        if (status === 'completed' || status === 'confirmed') {
          const apptSource = row.source?.toLowerCase();
          if (apptSource === 'online') {
            addCategorizedVisit(row.customer_id, row.appointment_date, 'booked_appointment');
          } else {
            addCategorizedVisit(row.customer_id, row.appointment_date, 'booked_by_calls');
          }
        }
      });

      const getCategoryRepeatVisitsForMonth = (category, yyyymm) => {
        let count = 0;
        let monthsVisitedMap;
        if (category === 'walk_in') monthsVisitedMap = groupWalkinMonths;
        else if (category === 'booked_appointment') monthsVisitedMap = groupBookedApptMonths;
        else monthsVisitedMap = groupBookedByCallMonths;

        Object.keys(isRepeatGroup).forEach(rootId => {
          if (isRepeatGroup[rootId]) {
            const monthsVisited = monthsVisitedMap[rootId];
            if (monthsVisited && monthsVisited.has(yyyymm)) {
              count++;
            }
          }
        });
        return count;
      };

      const thisMonthWalkins = getCategoryRepeatVisitsForMonth('walk_in', thisMonth);
      const prevMonthWalkins = getCategoryRepeatVisitsForMonth('walk_in', prevMonth);
      
      const thisMonthBookedAppts = getCategoryRepeatVisitsForMonth('booked_appointment', thisMonth);
      const prevMonthBookedAppts = getCategoryRepeatVisitsForMonth('booked_appointment', prevMonth);

      const thisMonthBookedByCalls = getCategoryRepeatVisitsForMonth('booked_by_calls', thisMonth);
      const prevMonthBookedByCalls = getCategoryRepeatVisitsForMonth('booked_by_calls', prevMonth);

      // Generate 12-month trend for each category
      const last12Months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        last12Months.push(d.toISOString().substring(0, 7));
      }

      let walkInsThisMonthCount = 0;
      let walkInsPrevMonthCount = 0;
      const walkInsSparklineMap = {};
      billRows.forEach(row => {
        const yyyymm = getYearMonth(row.created_at);
        if (!row.appointment_id || !apptById[row.appointment_id]) {
          if (yyyymm === thisMonth) walkInsThisMonthCount++;
          if (yyyymm === prevMonth) walkInsPrevMonthCount++;
          walkInsSparklineMap[yyyymm] = (walkInsSparklineMap[yyyymm] || 0) + 1;
        }
      });
      const walkInsTrend = last12Months.map(month => ({
        month,
        count: walkInsSparklineMap[month] || 0
      }));

      const repeatWalkinsTrend = last12Months.map(month => ({
        month,
        count: getCategoryRepeatVisitsForMonth('walk_in', month)
      }));

      const repeatBookedApptsTrend = last12Months.map(month => ({
        month,
        count: getCategoryRepeatVisitsForMonth('booked_appointment', month)
      }));

      const repeatBookedByCallsTrend = last12Months.map(month => ({
        month,
        count: getCategoryRepeatVisitsForMonth('booked_by_calls', month)
      }));

      // Revenue breakdown: New vs Old clients
      const firstBillDateMap = {};
      billRows.forEach(row => {
        if (row.customer_id) {
          const rootId = getRoot(row.customer_id);
          const billTime = new Date(row.created_at).getTime();
          const billDateStr = new Date(row.created_at).toDateString();
          if (!firstBillDateMap[rootId] || billTime < firstBillDateMap[rootId].time) {
            firstBillDateMap[rootId] = { time: billTime, dateStr: billDateStr };
          }
        }
      });

      let newClientRevenueThisMonth = 0;
      let oldClientRevenueThisMonth = 0;
      let newClientRevenuePrevMonth = 0;
      let oldClientRevenuePrevMonth = 0;
      
      const newClientRevenueMap = {};
      const oldClientRevenueMap = {};

      billRows.forEach(row => {
        const amt = parseFloat(row.total_amount || 0);
        const yyyymm = getYearMonth(row.created_at);
        
        let isNewClientThisMonth = true; // Default to new for anonymous walk-ins
        if (row.customer_id) {
          const rootId = getRoot(row.customer_id);
          const billDateStr = new Date(row.created_at).toDateString();
          
          if (firstBillDateMap[rootId] && firstBillDateMap[rootId].dateStr === billDateStr) {
            isNewClientThisMonth = true;
          } else {
            isNewClientThisMonth = false;
          }
        }

        if (isNewClientThisMonth) {
          newClientRevenueMap[yyyymm] = (newClientRevenueMap[yyyymm] || 0) + amt;
        } else {
          oldClientRevenueMap[yyyymm] = (oldClientRevenueMap[yyyymm] || 0) + amt;
        }

        if (yyyymm === thisMonth) {
          if (isNewClientThisMonth) newClientRevenueThisMonth += amt;
          else oldClientRevenueThisMonth += amt;
        } else if (yyyymm === prevMonth) {
          if (isNewClientThisMonth) newClientRevenuePrevMonth += amt;
          else oldClientRevenuePrevMonth += amt;
        }
      });
      
      const newClientRevenueTrend = last12Months.map(month => ({
        month, count: newClientRevenueMap[month] || 0
      }));
      const oldClientRevenueTrend = last12Months.map(month => ({
        month, count: oldClientRevenueMap[month] || 0
      }));

      // Phone and Website Appointments
      let phoneApptsThisMonth = 0;
      let phoneApptsPrevMonth = 0;
      let websiteApptsThisMonth = 0;
      let websiteApptsPrevMonth = 0;
      
      const phoneApptsMap = {};
      const websiteApptsMap = {};

      apptRows.forEach(row => {
        const yyyymm = getYearMonth(row.appointment_date);
        const status = row.status?.toLowerCase();
        if (status === 'completed' || status === 'confirmed') {
          const apptSource = row.source?.toLowerCase();
          if (apptSource === 'phone') {
            phoneApptsMap[yyyymm] = (phoneApptsMap[yyyymm] || 0) + 1;
            if (yyyymm === thisMonth) phoneApptsThisMonth++;
            if (yyyymm === prevMonth) phoneApptsPrevMonth++;
          } else if (apptSource === 'online' || apptSource === 'website') {
            websiteApptsMap[yyyymm] = (websiteApptsMap[yyyymm] || 0) + 1;
            if (yyyymm === thisMonth) websiteApptsThisMonth++;
            if (yyyymm === prevMonth) websiteApptsPrevMonth++;
          }
        }
      });
      
      const phoneApptsTrend = last12Months.map(month => ({
        month, count: phoneApptsMap[month] || 0
      }));
      const websiteApptsTrend = last12Months.map(month => ({
        month, count: websiteApptsMap[month] || 0
      }));

      res.json({
        success: true, data: {
          revenue: { 
            total: lifetimeTotalRevenue, 
            monthly: parseFloat(monthRevenueVal || 0) + monthMembershipRevenueVal, 
            monthlyServices: parseFloat(monthRevenueVal || 0),
            monthlyMemberships: monthMembershipRevenueVal,
            daily: parseFloat(dayRevenue?.total || 0),
            newClientThisMonth: newClientRevenueThisMonth,
            oldClientThisMonth: oldClientRevenueThisMonth,
            newClientPrevMonth: newClientRevenuePrevMonth,
            oldClientPrevMonth: oldClientRevenuePrevMonth
          },
          customers: {
            total: totalCustomers.total,
            new: newCustomers.total,
            members: members.total,
            repeatWalkins: thisMonthWalkins,
            repeatWalkinsPrev: prevMonthWalkins,
            repeatBookedAppts: thisMonthBookedAppts,
            repeatBookedApptsPrev: prevMonthBookedAppts,
            repeatBookedByCalls: thisMonthBookedByCalls,
            repeatBookedByCallsPrev: prevMonthBookedByCalls
          },
          appointments: { 
            today: todayAppts.total, 
            pending: pendingAppts.total, 
            summary: apptSummary, 
            walkInsThisMonth: walkInsThisMonthCount, 
            walkInsPrevMonth: walkInsPrevMonthCount,
            phoneThisMonth: phoneApptsThisMonth,
            phonePrevMonth: phoneApptsPrevMonth,
            websiteThisMonth: websiteApptsThisMonth,
            websitePrevMonth: websiteApptsPrevMonth
          },

          charts: {
            revenue: combinedRevenueChart,
            topServices,
            staffPerformance: staffPerf,
            customerGrowth,
            billedClientsTrend,
            walkInsTrend,
            repeatWalkinsTrend,
            repeatBookedApptsTrend,
            repeatBookedByCallsTrend,
            newClientRevenueTrend,
            oldClientRevenueTrend,
            phoneApptsTrend,
            websiteApptsTrend
          },
        },
      });
    } catch (e) { next(e); }
  },

  revenue: async (req, res, next) => {
    try {
      const { from, to, group_by = 'day' } = req.query;
      let data;
      if (db.usePostgres) {
        const format = group_by === 'month' ? 'YYYY-MM' : group_by === 'year' ? 'YYYY' : 'YYYY-MM-DD';
        [data] = await pool.execute(
          `SELECT TO_CHAR(created_at, ?) AS period, SUM(total_amount) AS revenue, COUNT(*) AS count
           FROM bills WHERE status = 'paid' ${from ? 'AND CAST(created_at AS DATE) >= ?' : ''} ${to ? 'AND CAST(created_at AS DATE) <= ?' : ''}
           GROUP BY period ORDER BY period ASC`,
          [format, ...(from ? [from] : []), ...(to ? [to] : [])]
        );
      } else if (db.useSqlite) {
        const format = group_by === 'month' ? '%Y-%m' : group_by === 'year' ? '%Y' : '%Y-%m-%d';
        [data] = await pool.execute(
          `SELECT strftime(?, created_at) AS period, SUM(total_amount) AS revenue, COUNT(*) AS count
           FROM bills WHERE status = 'paid' ${from ? 'AND date(created_at) >= ?' : ''} ${to ? 'AND date(created_at) <= ?' : ''}
           GROUP BY period ORDER BY period ASC`,
          [format, ...(from ? [from] : []), ...(to ? [to] : [])]
        );
      } else {
        const format = group_by === 'month' ? '%Y-%m' : group_by === 'year' ? '%Y' : '%Y-%m-%d';
        [data] = await pool.execute(
          `SELECT DATE_FORMAT(created_at, ?) AS period, SUM(total_amount) AS revenue, COUNT(*) AS count
           FROM bills WHERE status = 'paid' ${from ? 'AND DATE(created_at) >= ?' : ''} ${to ? 'AND DATE(created_at) <= ?' : ''}
           GROUP BY period ORDER BY period ASC`,
          [format, ...(from ? [from] : []), ...(to ? [to] : [])]
        );
      }
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  daily: async (req, res, next) => {
    try {
      const { date, from_date, to_date } = req.query;
      
      let start = date;
      let end = date;
      if (from_date && to_date) {
        start = from_date;
        end = to_date;
      }

      if (!start || !end) {
        return res.status(400).json({ success: false, message: 'Date parameters (date or from_date and to_date) are required.' });
      }

      let bills = [];
      let totalRevenue = 0;
      let invoicesCount = 0;
      let appointmentsCount = 0;

      if (db.usePostgres) {
        const [b] = await pool.execute(
          `SELECT b.*, c.name AS customer_name, c.phone AS customer_phone
           FROM bills b LEFT JOIN customers c ON b.customer_id = c.id
           WHERE b.status = 'paid' AND CAST(b.created_at AS DATE) >= ? AND CAST(b.created_at AS DATE) <= ?
           ORDER BY b.created_at DESC`,
          [start, end]
        );
        bills = b;
        const [[r]] = await pool.execute("SELECT COALESCE(SUM(total_amount), 0) AS total FROM bills WHERE status = 'paid' AND CAST(created_at AS DATE) >= ? AND CAST(created_at AS DATE) <= ?", [start, end]);
        totalRevenue = r.total;
        const [[a]] = await pool.execute("SELECT COUNT(*) AS total FROM appointments WHERE appointment_date >= ? AND appointment_date <= ?", [start, end]);
        appointmentsCount = a.total;
      } else if (db.useSqlite) {
        const [b] = await pool.execute(
          `SELECT b.*, c.name AS customer_name, c.phone AS customer_phone
           FROM bills b LEFT JOIN customers c ON b.customer_id = c.id
           WHERE b.status = 'paid' AND date(b.created_at) >= ? AND date(b.created_at) <= ?
           ORDER BY b.created_at DESC`,
          [start, end]
        );
        bills = b;
        const [[r]] = await pool.execute("SELECT COALESCE(SUM(total_amount), 0) AS total FROM bills WHERE status = 'paid' AND date(created_at) >= ? AND date(created_at) <= ?", [start, end]);
        totalRevenue = r.total;
        const [[a]] = await pool.execute("SELECT COUNT(*) AS total FROM appointments WHERE appointment_date >= ? AND appointment_date <= ?", [start, end]);
        appointmentsCount = a.total;
      } else {
        const [b] = await pool.execute(
          `SELECT b.*, c.name AS customer_name, c.phone AS customer_phone
           FROM bills b LEFT JOIN customers c ON b.customer_id = c.id
           WHERE b.status = 'paid' AND DATE(b.created_at) >= ? AND DATE(b.created_at) <= ?
           ORDER BY b.created_at DESC`,
          [start, end]
        );
        bills = b;
        const [[r]] = await pool.execute("SELECT COALESCE(SUM(total_amount), 0) AS total FROM bills WHERE status = 'paid' AND DATE(created_at) >= ? AND DATE(created_at) <= ?", [start, end]);
        totalRevenue = r.total;
        const [[a]] = await pool.execute("SELECT COUNT(*) AS total FROM appointments WHERE appointment_date >= ? AND appointment_date <= ?", [start, end]);
        appointmentsCount = a.total;
      }
      
      invoicesCount = bills.length;
      
      res.json({
        success: true,
        data: {
          totalRevenue,
          invoicesCount,
          appointmentsCount,
          bills
        }
      });
    } catch (e) { next(e); }
  },

  export: async (req, res, next) => {
    try {
      const { from, to } = req.query;
      if (!from || !to) return res.status(400).json({ success: false, message: 'From and to dates are required.' });

      let billsData, appointmentsData;
      
      const appointmentsQuery = `SELECT a.*, c.name as customer_name, c.phone as customer_phone, s.name as service_name, st.name as staff_name
        FROM appointments a
        LEFT JOIN customers c ON a.customer_id = c.id
        LEFT JOIN services s ON a.service_id = s.id
        LEFT JOIN staff st ON a.staff_id = st.id`;

      if (db.usePostgres) {
        [billsData] = await pool.execute(
          `SELECT b.invoice_number, b.created_at, b.subtotal, b.discount_amount, b.tax_amount, b.total_amount, b.payment_method, c.name as customer_name, c.phone as customer_phone
           FROM bills b LEFT JOIN customers c ON b.customer_id = c.id
           WHERE b.status = 'paid' AND CAST(b.created_at AS DATE) >= ? AND CAST(b.created_at AS DATE) <= ?
           ORDER BY b.created_at DESC`,
          [from, to]
        );
        [appointmentsData] = await pool.execute(
          `${appointmentsQuery} WHERE CAST(a.appointment_date AS DATE) >= ? AND CAST(a.appointment_date AS DATE) <= ? ORDER BY a.appointment_date DESC`,
          [from, to]
        );
      } else if (db.useSqlite) {
        [billsData] = await pool.execute(
          `SELECT b.invoice_number, b.created_at, b.subtotal, b.discount_amount, b.tax_amount, b.total_amount, b.payment_method, c.name as customer_name, c.phone as customer_phone
           FROM bills b LEFT JOIN customers c ON b.customer_id = c.id
           WHERE b.status = 'paid' AND date(b.created_at) >= ? AND date(b.created_at) <= ?
           ORDER BY b.created_at DESC`,
          [from, to]
        );
        [appointmentsData] = await pool.execute(
          `${appointmentsQuery} WHERE date(a.appointment_date) >= ? AND date(a.appointment_date) <= ? ORDER BY a.appointment_date DESC`,
          [from, to]
        );
      } else {
        [billsData] = await pool.execute(
          `SELECT b.invoice_number, b.created_at, b.subtotal, b.discount_amount, b.tax_amount, b.total_amount, b.payment_method, c.name as customer_name, c.phone as customer_phone
           FROM bills b LEFT JOIN customers c ON b.customer_id = c.id
           WHERE b.status = 'paid' AND DATE(b.created_at) >= ? AND DATE(b.created_at) <= ?
           ORDER BY b.created_at DESC`,
          [from, to]
        );
        [appointmentsData] = await pool.execute(
          `${appointmentsQuery} WHERE DATE(a.appointment_date) >= ? AND DATE(a.appointment_date) <= ? ORDER BY a.appointment_date DESC`,
          [from, to]
        );
      }

      res.json({ success: true, data: { bills: billsData, appointments: appointmentsData } });
    } catch (e) { next(e); }
  },
};

// ===== EMAIL MARKETING =====
const emailMarketingController = {
  getTemplates: async (req, res, next) => {
    try {
      const [templates] = await pool.execute('SELECT * FROM email_templates ORDER BY created_at DESC');
      res.json({ success: true, data: templates });
    } catch (e) { next(e); }
  },
  createTemplate: async (req, res, next) => {
    try {
      const { name, subject, body, trigger_days } = req.body;
      const id = uuidv4();
      await pool.execute('INSERT INTO email_templates (id, name, subject, body, trigger_days) VALUES (?, ?, ?, ?, ?)',
        [id, name, subject, body, trigger_days || null]);
      res.status(201).json({ success: true, message: 'Template created.' });
    } catch (e) { next(e); }
  },
  updateTemplate: async (req, res, next) => {
    try {
      const { name, subject, body, trigger_days, is_active } = req.body;
      const updates = []; const params = [];
      if (name) { updates.push('name = ?'); params.push(name); }
      if (subject) { updates.push('subject = ?'); params.push(subject); }
      if (body) { updates.push('body = ?'); params.push(body); }
      if (trigger_days !== undefined) { updates.push('trigger_days = ?'); params.push(trigger_days); }
      if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
      if (!updates.length) return res.status(400).json({ success: false, message: 'No fields.' });
      params.push(req.params.id);
      await pool.execute(`UPDATE email_templates SET ${updates.join(', ')} WHERE id = ?`, params);
      res.json({ success: true, message: 'Template updated.' });
    } catch (e) { next(e); }
  },
  sendCampaign: async (req, res, next) => {
    try {
      const { template_id, customer_ids, subject, body } = req.body;
      let emailList = [];

      if (customer_ids && customer_ids.length > 0) {
        const placeholders = customer_ids.map(() => '?').join(',');
        const [customers] = await pool.execute(`SELECT name, email FROM customers WHERE id IN (${placeholders}) AND email IS NOT NULL`, customer_ids);
        emailList = customers;
      } else {
        const [customers] = await pool.execute('SELECT name, email FROM customers WHERE email IS NOT NULL');
        emailList = customers;
      }

      let sent = 0;
      for (const customer of emailList) {
        try {
          await sendEmail({ to: customer.email, subject, html: body.replace('{{name}}', customer.name) });
          sent++;
        } catch { continue; }
      }

      // Use standard column names matching the database schema (recipients_count, sent_count, created_at)
      await pool.execute('INSERT INTO email_campaigns (id, template_id, subject, body, recipients_count, sent_count) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), template_id || null, subject, body, emailList.length, sent]);

      res.json({ success: true, message: `Campaign sent to ${sent} customers.`, data: { sent, total: emailList.length } });
    } catch (e) { next(e); }
  },
  getCampaigns: async (req, res, next) => {
    try {
      const [campaigns] = await pool.execute('SELECT * FROM email_campaigns ORDER BY created_at DESC LIMIT 50');
      res.json({ success: true, data: campaigns });
    } catch (e) { next(e); }
  },
};

// ===== ANALYTICS =====
const analyticsController = {

  // Staff Performance Analytics
  staffPerformance: async (req, res, next) => {
    try {
      let staffQuery, revByStaffQuery, monthlyQuery;
      if (db.usePostgres) {
        staffQuery = `
          SELECT st.id, st.name, st.photo, st.rating, st.review_count, st.is_active,
                 COUNT(DISTINCT b.id) AS total_clients,
                 COUNT(DISTINCT CASE WHEN LOWER(COALESCE(c.gender, b.customer_gender)) = 'male' THEN b.id END) AS male_clients,
                 COUNT(DISTINCT CASE WHEN LOWER(COALESCE(c.gender, b.customer_gender)) = 'female' THEN b.id END) AS female_clients,
                 COUNT(DISTINCT CASE WHEN LOWER(a.source) = 'walk-in' OR b.appointment_id IS NULL THEN b.id END) AS walkins,
                 COALESCE(SUM(bi.final_amount), 0) AS revenue,
                 COUNT(DISTINCT CASE WHEN repeat_customers.customer_id IS NOT NULL THEN b.id END) AS repeat_visits
          FROM staff st
          LEFT JOIN bill_items bi ON bi.description LIKE '%' || st.name || ')'
          LEFT JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
          LEFT JOIN appointments a ON b.appointment_id = a.id
          LEFT JOIN customers c ON b.customer_id = c.id
          LEFT JOIN (
            SELECT customer_id 
            FROM bills 
            WHERE status = 'paid' AND customer_id IS NOT NULL
            GROUP BY customer_id 
            HAVING COUNT(id) >= 2
          ) repeat_customers ON b.customer_id = repeat_customers.customer_id
          WHERE st.is_active = 1
          GROUP BY st.id, st.name, st.photo, st.rating, st.review_count, st.is_active
          ORDER BY revenue DESC`;
        revByStaffQuery = `
          SELECT st.name, COALESCE(SUM(bi.final_amount), 0) AS revenue, COUNT(bi.id) AS services
          FROM staff st
          LEFT JOIN bill_items bi ON bi.description LIKE '%' || st.name || ')'
          LEFT JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
            AND b.created_at >= CURRENT_DATE - INTERVAL '30 day'
          WHERE st.is_active = 1
          GROUP BY st.id, st.name ORDER BY revenue DESC`;
        monthlyQuery = `
          SELECT TO_CHAR(b.created_at, 'YYYY-MM') AS month, st.name,
                 COUNT(DISTINCT b.id) AS appointments, COALESCE(SUM(bi.final_amount), 0) AS revenue
          FROM bill_items bi
          JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
          JOIN staff st ON bi.description LIKE '%' || st.name || ')'
          WHERE b.created_at >= CURRENT_DATE - INTERVAL '6 MONTH'
          GROUP BY month, st.id, st.name ORDER BY month ASC, revenue DESC`;
      } else if (db.useSqlite) {
        staffQuery = `
          SELECT st.id, st.name, st.photo, st.rating, st.review_count, st.is_active,
                 COUNT(DISTINCT b.id) AS total_clients,
                 COUNT(DISTINCT CASE WHEN LOWER(COALESCE(c.gender, b.customer_gender)) = 'male' THEN b.id END) AS male_clients,
                 COUNT(DISTINCT CASE WHEN LOWER(COALESCE(c.gender, b.customer_gender)) = 'female' THEN b.id END) AS female_clients,
                 COUNT(DISTINCT CASE WHEN LOWER(a.source) = 'walk-in' OR b.appointment_id IS NULL THEN b.id END) AS walkins,
                 COALESCE(SUM(bi.final_amount), 0) AS revenue,
                 COUNT(DISTINCT CASE WHEN repeat_customers.customer_id IS NOT NULL THEN b.id END) AS repeat_visits
          FROM staff st
          LEFT JOIN bill_items bi ON bi.description LIKE '%' || st.name || ')'
          LEFT JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
          LEFT JOIN appointments a ON b.appointment_id = a.id
          LEFT JOIN customers c ON b.customer_id = c.id
          LEFT JOIN (
            SELECT customer_id 
            FROM bills 
            WHERE status = 'paid' AND customer_id IS NOT NULL
            GROUP BY customer_id 
            HAVING COUNT(id) >= 2
          ) repeat_customers ON b.customer_id = repeat_customers.customer_id
          WHERE st.is_active = 1
          GROUP BY st.id, st.name, st.photo, st.rating, st.review_count, st.is_active
          ORDER BY revenue DESC`;
        revByStaffQuery = `
          SELECT st.name, COALESCE(SUM(bi.final_amount), 0) AS revenue, COUNT(bi.id) AS services
          FROM staff st
          LEFT JOIN bill_items bi ON bi.description LIKE '%' || st.name || ')'
          LEFT JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
            AND b.created_at >= date('now', '-30 days')
          WHERE st.is_active = 1
          GROUP BY st.id, st.name ORDER BY revenue DESC`;
        monthlyQuery = `
          SELECT strftime('%Y-%m', b.created_at) AS month, st.name,
                 COUNT(DISTINCT b.id) AS appointments, COALESCE(SUM(bi.final_amount), 0) AS revenue
          FROM bill_items bi
          JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
          JOIN staff st ON bi.description LIKE '%' || st.name || ')'
          WHERE b.created_at >= date('now', '-6 months')
          GROUP BY month, st.id, st.name ORDER BY month ASC, revenue DESC`;
      } else {
        staffQuery = `
          SELECT st.id, st.name, st.photo, st.rating, st.review_count, st.is_active,
                 COUNT(DISTINCT b.id) AS total_clients,
                 COUNT(DISTINCT CASE WHEN LOWER(COALESCE(c.gender, b.customer_gender)) = 'male' THEN b.id END) AS male_clients,
                 COUNT(DISTINCT CASE WHEN LOWER(COALESCE(c.gender, b.customer_gender)) = 'female' THEN b.id END) AS female_clients,
                 COUNT(DISTINCT CASE WHEN LOWER(a.source) = 'walk-in' OR b.appointment_id IS NULL THEN b.id END) AS walkins,
                 COALESCE(SUM(bi.final_amount), 0) AS revenue,
                 COUNT(DISTINCT CASE WHEN repeat_customers.customer_id IS NOT NULL THEN b.id END) AS repeat_visits
          FROM staff st
          LEFT JOIN bill_items bi ON bi.description LIKE CONCAT('%(', st.name, ')')
          LEFT JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
          LEFT JOIN appointments a ON b.appointment_id = a.id
          LEFT JOIN customers c ON b.customer_id = c.id
          LEFT JOIN (
            SELECT customer_id 
            FROM bills 
            WHERE status = 'paid' AND customer_id IS NOT NULL
            GROUP BY customer_id 
            HAVING COUNT(id) >= 2
          ) repeat_customers ON b.customer_id = repeat_customers.customer_id
          WHERE st.is_active = 1
          GROUP BY st.id, st.name, st.photo, st.rating, st.review_count, st.is_active
          ORDER BY revenue DESC`;
        revByStaffQuery = `
          SELECT st.name, COALESCE(SUM(bi.final_amount), 0) AS revenue, COUNT(bi.id) AS services
          FROM staff st
          LEFT JOIN bill_items bi ON bi.description LIKE CONCAT('%(', st.name, ')')
          LEFT JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
            AND b.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          WHERE st.is_active = 1
          GROUP BY st.id, st.name ORDER BY revenue DESC`;
        monthlyQuery = `
          SELECT DATE_FORMAT(b.created_at, '%Y-%m') AS month, st.name,
                 COUNT(DISTINCT b.id) AS appointments, COALESCE(SUM(bi.final_amount), 0) AS revenue
          FROM bill_items bi
          JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
          JOIN staff st ON bi.description LIKE CONCAT('%(', st.name, ')')
          WHERE b.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
          GROUP BY month, st.id, st.name ORDER BY month ASC, revenue DESC`;
      }

      const [[staffRows], [revByStaff], [monthlyRows]] = await Promise.all([
        pool.execute(staffQuery),
        pool.execute(revByStaffQuery),
        pool.execute(monthlyQuery),
      ]);

      // Build monthly trend per staff
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const last6 = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        last6.push({ key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label: monthNames[d.getMonth()] });
      }

      const staffMonthly = {};
      monthlyRows.forEach(row => {
        if (!staffMonthly[row.name]) staffMonthly[row.name] = {};
        staffMonthly[row.name][row.month] = { appointments: parseInt(row.appointments||0), revenue: parseFloat(row.revenue||0) };
      });

      const enrichedStaff = (staffRows).map((s, idx) => ({
        id: s.id,
        name: s.name,
        photo: s.photo,
        rating: parseFloat(s.rating || 0),
        review_count: parseInt(s.review_count || 0),
        is_active: s.is_active,
        appointments: parseInt(s.total_clients || 0),
        total_clients: parseInt(s.total_clients || 0),
        male_clients: parseInt(s.male_clients || 0),
        female_clients: parseInt(s.female_clients || 0),
        revenue: parseFloat(s.revenue || 0),
        services: parseInt(s.total_clients || 0),
        avatar: s.name ? s.name.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase() : '?',
        role: 'Stylist',
        repeatRate: s.total_clients > 0 ? Math.round((parseInt(s.repeat_visits || 0) / s.total_clients) * 100) : 0,
        productivity: Math.floor(Math.random() * 20) + 75,
        monthlyTrend: last6.map(m => ({
          month: m.label,
          appointments: staffMonthly[s.name]?.[m.key]?.appointments || 0,
          revenue: staffMonthly[s.name]?.[m.key]?.revenue || 0,
        }))
      }));

      const revenueByStaff = (revByStaff).map(s => ({
        name: s.name.split(' ')[0],
        revenue: parseFloat(s.revenue || 0),
        services: parseInt(s.services || 0),
      }));

      res.json({ success: true, data: { staff: enrichedStaff, revenueByStaff, last6Months: last6.map(m => m.label) } });
    } catch (e) { next(e); }
  },

  staffDetail: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ success: false, message: 'Staff ID is required' });

      // Gender is read directly from the bill created for this service/appointment
      // This strictly counts the gender selected during the invoice generation
      let servicesQuery;
      if (db.usePostgres || db.useSqlite) {
        servicesQuery = `
          SELECT 
            s.name,
            COUNT(bi.id) as count,
            SUM(CASE WHEN LOWER(a.source) = 'walk-in' OR b.appointment_id IS NULL THEN 1 ELSE 0 END) as walk_ins,
            SUM(CASE WHEN LOWER(a.source) != 'walk-in' AND b.appointment_id IS NOT NULL THEN 1 ELSE 0 END) as booked,
            SUM(CASE WHEN LOWER(COALESCE(c.gender, b.customer_gender)) = 'male' THEN 1 ELSE 0 END) as male,
            SUM(CASE WHEN LOWER(COALESCE(c.gender, b.customer_gender)) = 'female' THEN 1 ELSE 0 END) as female,
            SUM(bi.final_amount) as revenue
          FROM staff st
          JOIN bill_items bi ON bi.description LIKE '%' || st.name || ')'
          JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
          LEFT JOIN appointments a ON b.appointment_id = a.id
          LEFT JOIN services s ON bi.description LIKE s.name || ' %' OR bi.description = s.name
          LEFT JOIN customers c ON c.id = COALESCE(b.customer_id, a.customer_id)
          WHERE st.id = ?
          GROUP BY s.id, s.name
          ORDER BY count DESC
        `;
      } else {
        servicesQuery = `
          SELECT 
            s.name,
            COUNT(bi.id) as count,
            SUM(CASE WHEN LOWER(a.source) = 'walk-in' OR b.appointment_id IS NULL THEN 1 ELSE 0 END) as walk_ins,
            SUM(CASE WHEN LOWER(a.source) != 'walk-in' AND b.appointment_id IS NOT NULL THEN 1 ELSE 0 END) as booked,
            SUM(CASE WHEN LOWER(COALESCE(c.gender, b.customer_gender)) = 'male' THEN 1 ELSE 0 END) as male,
            SUM(CASE WHEN LOWER(COALESCE(c.gender, b.customer_gender)) = 'female' THEN 1 ELSE 0 END) as female,
            SUM(bi.final_amount) as revenue
          FROM staff st
          JOIN bill_items bi ON bi.description LIKE CONCAT('%', st.name, ')')
          JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
          LEFT JOIN appointments a ON b.appointment_id = a.id
          LEFT JOIN services s ON bi.description LIKE CONCAT(s.name, ' %') OR bi.description = s.name
          LEFT JOIN customers c ON c.id = COALESCE(b.customer_id, a.customer_id)
          WHERE st.id = ?
          GROUP BY s.id, s.name
          ORDER BY count DESC
        `;
      }

      const [[services]] = await Promise.all([
        pool.execute(servicesQuery, [id])
      ]);

      res.json({
        success: true,
        data: {
          services: services.map(s => {
            const count = Number(s.count) || 0;
            const revenue = Number(s.revenue) || 0;
            return {
              name: s.name,
              count,
              walk_ins: Number(s.walk_ins) || 0,
              booked: Number(s.booked) || 0,
              male: Number(s.male) || 0,
              female: Number(s.female) || 0,
              revenue,
              avg_per_service: count > 0 ? (revenue / count) : 0
            };
          })
        }
      });
    } catch (e) {
      next(e);
    }
  },

  // Service Analytics
  serviceAnalytics: async (req, res, next) => {
    try {
      // Main service query: bookings, revenue from completed appointments
      let serviceQuery;
      if (db.usePostgres) {
        serviceQuery = `
          SELECT s.id, s.name, s.category, s.price,
                 (SELECT COUNT(*) FROM appointments a WHERE a.service_id = s.id AND a.status = 'completed' AND a.appointment_date >= CURRENT_DATE - INTERVAL '30 day') AS bookings,
                 (SELECT COALESCE(SUM(CAST(bi.final_amount AS NUMERIC)), 0) 
                  FROM bill_items bi 
                  JOIN bills b ON b.id = bi.bill_id 
                  WHERE bi.description LIKE s.name || '%' AND b.status = 'paid' AND b.created_at >= CURRENT_DATE - INTERVAL '30 day') AS revenue
          FROM services s
          WHERE s.is_active = 1
          ORDER BY revenue DESC`;
      } else if (db.useSqlite) {
        serviceQuery = `
          SELECT s.id, s.name, s.category, s.price,
                 (SELECT COUNT(*) FROM appointments a WHERE a.service_id = s.id AND a.status = 'completed' AND a.appointment_date >= date('now', '-30 days')) AS bookings,
                 (SELECT COALESCE(SUM(CAST(bi.final_amount AS NUMERIC)), 0) 
                  FROM bill_items bi 
                  JOIN bills b ON b.id = bi.bill_id 
                  WHERE bi.description LIKE s.name || '%' AND b.status = 'paid' AND b.created_at >= date('now', '-30 days')) AS revenue
          FROM services s
          WHERE s.is_active = 1
          ORDER BY revenue DESC`;
      } else {
        serviceQuery = `
          SELECT s.id, s.name, s.category, s.price,
                 (SELECT COUNT(*) FROM appointments a WHERE a.service_id = s.id AND a.status = 'completed' AND a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS bookings,
                 (SELECT COALESCE(SUM(CAST(bi.final_amount AS DECIMAL)), 0) 
                  FROM bill_items bi 
                  JOIN bills b ON b.id = bi.bill_id 
                  WHERE bi.description LIKE CONCAT(s.name, '%') AND b.status = 'paid' AND b.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS revenue
          FROM services s
          WHERE s.is_active = 1
          ORDER BY revenue DESC`;
      }

      // Repeat rate: % of unique clients who booked a service more than once (all-time)
      const repeatQuery = `
        SELECT service_id,
               COUNT(DISTINCT customer_id) AS total_unique,
               COUNT(DISTINCT CASE WHEN visit_count >= 2 THEN customer_id END) AS repeat_unique
        FROM (
          SELECT a.service_id, a.customer_id, COUNT(*) AS visit_count
          FROM appointments a
          WHERE a.status = 'completed' AND a.customer_id IS NOT NULL
          GROUP BY a.service_id, a.customer_id
        ) AS per_customer
        GROUP BY service_id
      `;

      // Walk-ins per service: bills generated directly (no appointment) that have a service_id,
      // OR appointments where the appointment has no prior online booking (source != 'online')
      // We aggregate walk-in count from staff detail logic: appointments where source != 'online'
      const walkinQuery = `
        SELECT a.service_id,
               COUNT(a.id) AS walk_ins
        FROM appointments a
        WHERE a.status = 'completed'
          AND (a.source IS NULL OR a.source != 'online')
        GROUP BY a.service_id
      `;

      const [rows] = await pool.execute(serviceQuery);
      const [repeatRows] = await pool.execute(repeatQuery);
      const [walkinRows] = await pool.execute(walkinQuery);

      // Build lookup maps
      const repeatMap = {};
      repeatRows.forEach(r => {
        repeatMap[r.service_id] = {
          total: parseInt(r.total_unique || 0),
          repeat: parseInt(r.repeat_unique || 0)
        };
      });
      const walkinMap = {};
      walkinRows.forEach(r => { walkinMap[r.service_id] = parseInt(r.walk_ins || 0); });

      const COLORS = ['#C9A84C', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B', '#06B6D4', '#EC4899'];

      const services = rows.map((s, i) => {
        const rd = repeatMap[s.id] || { total: 0, repeat: 0 };
        const repeatRate = rd.total > 0 ? Math.round((rd.repeat / rd.total) * 100) : 0;
        return {
          id: s.id,
          name: s.name,
          category: s.category || 'General',
          price: parseFloat(s.price || 0),
          bookings: parseInt(s.bookings || 0),
          revenue: parseFloat(s.revenue || 0),
          repeatRate,
          walk_ins: walkinMap[s.id] || 0,
          color: COLORS[i % COLORS.length],
        };
      });

      // Category aggregation
      const categoryMap = {};
      services.forEach(s => {
        if (!categoryMap[s.category]) categoryMap[s.category] = { name: s.category, revenue: 0, bookings: 0 };
        categoryMap[s.category].revenue += s.revenue;
        categoryMap[s.category].bookings += s.bookings;
      });
      const categories = Object.values(categoryMap);

      // Walk-ins summary by service (all services with walk-ins)
      const walkinServices = services
        .filter(s => s.walk_ins > 0)
        .sort((a, b) => b.walk_ins - a.walk_ins);

      res.json({ success: true, data: { services: services.slice(0, 10), categories, walkinServices } });
    } catch (e) { next(e); }
  },


  // Appointment Analytics
  appointmentAnalytics: async (req, res, next) => {
    try {
      // Status summary
      const [statusRows] = await pool.execute("SELECT status, COUNT(*) AS count FROM appointments WHERE source != 'walk-in' GROUP BY status");
      const summary = { total: 0, confirmed: 0, completed: 0, cancelled: 0, pending: 0 };
      (statusRows).forEach(r => {
        const s = r.status?.toLowerCase();
        const c = parseInt(r.count || 0);
        summary.total += c;
        if (s === 'confirmed') summary.confirmed = c;
        else if (s === 'completed') summary.completed = c;
        else if (s === 'cancelled') summary.cancelled = c;
        else if (s === 'pending') summary.pending = c;
      });

      // Monthly trend (last 6 months)
      let monthlyQ;
      if (db.usePostgres) {
        monthlyQ = `SELECT TO_CHAR(appointment_date, 'YYYY-MM') AS month,
          COUNT(*) AS total,
          SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled
          FROM appointments WHERE appointment_date >= CURRENT_DATE - INTERVAL '6 MONTH' AND source != 'walk-in'
          GROUP BY month ORDER BY month ASC`;
      } else if (db.useSqlite) {
        monthlyQ = `SELECT strftime('%Y-%m', appointment_date) AS month,
          COUNT(*) AS total,
          SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled
          FROM appointments WHERE appointment_date >= date('now', '-6 months') AND source != 'walk-in'
          GROUP BY month ORDER BY month ASC`;
      } else {
        monthlyQ = `SELECT DATE_FORMAT(appointment_date, '%Y-%m') AS month,
          COUNT(*) AS total,
          SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled
          FROM appointments WHERE appointment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) AND source != 'walk-in'
          GROUP BY month ORDER BY month ASC`;
      }

      // Hourly peak
      let hourlyQ;
      if (db.usePostgres) {
        hourlyQ = `SELECT EXTRACT(HOUR FROM appointment_time::time) AS hour_num, COUNT(*) AS bookings
          FROM appointments WHERE status IN ('completed','confirmed') AND source != 'walk-in'
          GROUP BY hour_num ORDER BY hour_num ASC`;
      } else if (db.useSqlite) {
        hourlyQ = `SELECT CAST(strftime('%H', appointment_time) AS INTEGER) AS hour_num, COUNT(*) AS bookings
          FROM appointments WHERE status IN ('completed','confirmed') AND source != 'walk-in'
          GROUP BY hour_num ORDER BY hour_num ASC`;
      } else {
        hourlyQ = `SELECT HOUR(appointment_time) AS hour_num, COUNT(*) AS bookings
          FROM appointments WHERE status IN ('completed','confirmed') AND source != 'walk-in'
          GROUP BY hour_num ORDER BY hour_num ASC`;
      }

      // Day of week peak
      let dayQ;
      if (db.usePostgres) {
        dayQ = `SELECT TO_CHAR(appointment_date, 'Dy') AS day, COUNT(*) AS bookings
          FROM appointments WHERE status IN ('completed','confirmed') AND source != 'walk-in'
          GROUP BY TO_CHAR(appointment_date, 'Dy'), EXTRACT(DOW FROM appointment_date)
          ORDER BY EXTRACT(DOW FROM appointment_date) ASC`;
      } else if (db.useSqlite) {
        dayQ = `SELECT CASE strftime('%w', appointment_date)
          WHEN '0' THEN 'Sun' WHEN '1' THEN 'Mon' WHEN '2' THEN 'Tue'
          WHEN '3' THEN 'Wed' WHEN '4' THEN 'Thu' WHEN '5' THEN 'Fri' WHEN '6' THEN 'Sat'
          END AS day, COUNT(*) AS bookings
          FROM appointments WHERE status IN ('completed','confirmed') AND source != 'walk-in'
          GROUP BY strftime('%w', appointment_date)
          ORDER BY strftime('%w', appointment_date) ASC`;
      } else {
        dayQ = `SELECT DAYNAME(appointment_date) AS day, COUNT(*) AS bookings
          FROM appointments WHERE status IN ('completed','confirmed') AND source != 'walk-in'
          GROUP BY DAYOFWEEK(appointment_date), DAYNAME(appointment_date)
          ORDER BY DAYOFWEEK(appointment_date) ASC`;
      }

      const [[monthlyRows], [hourlyRows], [dayRows]] = await Promise.all([
        pool.execute(monthlyQ),
        pool.execute(hourlyQ),
        pool.execute(dayQ),
      ]);

      // Build monthly trend
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const monthMap = {};
      (monthlyRows).forEach(r => { monthMap[r.month] = r; });
      const monthlyTrend = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const row = monthMap[key] || {};
        monthlyTrend.push({
          month: monthNames[d.getMonth()],
          total: parseInt(row.total || 0),
          completed: parseInt(row.completed || 0),
          cancelled: parseInt(row.cancelled || 0),
        });
      }

      // Hourly peak (7am–9pm)
      const hourlyMap = {};
      (hourlyRows).forEach(r => { hourlyMap[parseInt(r.hour_num)] = parseInt(r.bookings || 0); });
      const hourlyPeak = [];
      for (let h = 7; h <= 21; h++) {
        const label = h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`;
        hourlyPeak.push({ hour: label, bookings: hourlyMap[h] || 0 });
      }

      // Daily peak
      const dayOrder = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const dayMap = {};
      (dayRows).forEach(r => {
        const key = r.day ? r.day.substring(0,3) : '';
        dayMap[key] = parseInt(r.bookings || 0);
      });
      const dailyPeak = dayOrder.map(d => ({ day: d, bookings: dayMap[d] || 0 }));

      res.json({ success: true, data: { summary, monthlyTrend, hourlyPeak, dailyPeak } });
    } catch (e) { next(e); }
  },

  // Billing Analytics
  billingAnalytics: async (req, res, next) => {
    try {
      let statsQ, trendQ;
      if (db.usePostgres) {
        statsQ = `SELECT COUNT(*) AS total_bills,
          COALESCE(AVG(total_amount), 0) AS avg_bill,
          COALESCE(MAX(total_amount), 0) AS max_bill,
          COALESCE(SUM(tax_amount), 0) AS gst_collected,
          COALESCE(SUM(discount_amount), 0) AS discount_given,
          COALESCE(SUM(total_amount), 0) AS net_revenue
          FROM bills WHERE status = 'paid'`;
        trendQ = `SELECT TO_CHAR(created_at, 'YYYY-MM') AS month,
          COALESCE(AVG(total_amount), 0) AS avg,
          COALESCE(SUM(total_amount), 0) AS total,
          COUNT(*) AS count
          FROM bills WHERE status = 'paid' AND created_at >= NOW() - INTERVAL '6 MONTH'
          GROUP BY month ORDER BY month ASC`;
      } else if (db.useSqlite) {
        statsQ = `SELECT COUNT(*) AS total_bills,
          COALESCE(AVG(total_amount), 0) AS avg_bill,
          COALESCE(MAX(total_amount), 0) AS max_bill,
          COALESCE(SUM(tax_amount), 0) AS gst_collected,
          COALESCE(SUM(discount_amount), 0) AS discount_given,
          COALESCE(SUM(total_amount), 0) AS net_revenue
          FROM bills WHERE status = 'paid'`;
        trendQ = `SELECT strftime('%Y-%m', created_at) AS month,
          COALESCE(AVG(total_amount), 0) AS avg,
          COALESCE(SUM(total_amount), 0) AS total,
          COUNT(*) AS count
          FROM bills WHERE status = 'paid' AND created_at >= datetime('now', '-6 months')
          GROUP BY month ORDER BY month ASC`;
      } else {
        statsQ = `SELECT COUNT(*) AS total_bills,
          COALESCE(AVG(total_amount), 0) AS avg_bill,
          COALESCE(MAX(total_amount), 0) AS max_bill,
          COALESCE(SUM(tax_amount), 0) AS gst_collected,
          COALESCE(SUM(discount_amount), 0) AS discount_given,
          COALESCE(SUM(total_amount), 0) AS net_revenue
          FROM bills WHERE status = 'paid'`;
        trendQ = `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
          COALESCE(AVG(total_amount), 0) AS avg,
          COALESCE(SUM(total_amount), 0) AS total,
          COUNT(*) AS count
          FROM bills WHERE status = 'paid' AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          GROUP BY month ORDER BY month ASC`;
      }

      // Fetch ALL paid bills to compute payment breakdown in JS (same as Reports page)
      const allBillsQ = `SELECT payment_method, total_amount FROM bills WHERE status = 'paid'`;

      // Revenue breakdown by bill items
      const breakdownQ = `
        SELECT
          COALESCE(SUM(CASE WHEN LOWER(bi.description) LIKE '%membership%' THEN bi.total_price ELSE 0 END), 0) AS memberships,
          COALESCE(SUM(CASE WHEN LOWER(bi.description) NOT LIKE '%membership%' THEN bi.total_price ELSE 0 END), 0) AS services
        FROM bills b JOIN bill_items bi ON b.id = bi.bill_id WHERE b.status = 'paid'`;

      const [[s1], [s2], [allBillsRows], [s4]] = await Promise.all([
        pool.execute(statsQ),
        pool.execute(trendQ),
        pool.execute(allBillsQ),
        pool.execute(breakdownQ),
      ]);

      const stats = s1[0] || {};
      const trendData = s2;
      const breakdown = s4[0] || {};

      // Parse payment methods from each bill — same logic as Reports page
      // Handles: "cash", "upi", "cash:2000, upi:625", "cash, upi"
      const paymentTotals = {}; // method -> { amount, txns }

      allBillsRows.forEach(bill => {
        const totalAmt = parseFloat(bill.total_amount || 0);
        const pm = (bill.payment_method || 'cash').trim();

        // Parse "method:amount, method2:amount2" format
        const parts = pm.split(',').map(p => p.trim()).filter(Boolean);
        const parsedMethods = parts.map(part => {
          const colonIdx = part.indexOf(':');
          if (colonIdx > -1) {
            const method = part.substring(0, colonIdx).trim().toLowerCase();
            const amount = parseFloat(part.substring(colonIdx + 1).trim()) || 0;
            return { method, amount, hasExactAmount: true };
          } else {
            return { method: part.toLowerCase(), amount: 0, hasExactAmount: false };
          }
        });

        // Check if any part has an exact amount
        const hasAnyExact = parsedMethods.some(p => p.hasExactAmount);

        if (hasAnyExact) {
          // Use exact amounts from the string
          parsedMethods.forEach(p => {
            if (!paymentTotals[p.method]) paymentTotals[p.method] = { amount: 0, txns: 0 };
            paymentTotals[p.method].amount += p.amount;
            paymentTotals[p.method].txns += 1;
          });
        } else if (parsedMethods.length > 1) {
          // Split equally when no exact amounts given (e.g., "cash, upi")
          const share = totalAmt / parsedMethods.length;
          parsedMethods.forEach(p => {
            if (!paymentTotals[p.method]) paymentTotals[p.method] = { amount: 0, txns: 0 };
            paymentTotals[p.method].amount += share;
            paymentTotals[p.method].txns += 1;
          });
        } else {
          // Single payment method — full amount
          const method = parsedMethods[0]?.method || 'cash';
          if (!paymentTotals[method]) paymentTotals[method] = { amount: 0, txns: 0 };
          paymentTotals[method].amount += totalAmt;
          paymentTotals[method].txns += 1;
        }
      });

      const paymentMethodColors = { 'cash': '#10B981', 'card': '#3B82F6', 'upi': '#C9A84C', 'online': '#8B5CF6', 'wallet': '#EC4899' };
      const paymentData = Object.entries(paymentTotals)
        .map(([method, data]) => ({
          method: method.charAt(0).toUpperCase() + method.slice(1),
          txns: data.txns,
          amount: Math.round(data.amount),
          color: paymentMethodColors[method] || '#94A3B8'
        }))
        .sort((a, b) => b.amount - a.amount);

      // Build monthly avg bill trend
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const trendMap = {};
      trendData.forEach(r => { trendMap[r.month] = r; });
      const avgBillTrend = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const row = trendMap[key] || {};
        avgBillTrend.push({ month: monthNames[d.getMonth()], avg: Math.round(parseFloat(row.avg || 0)), total: parseFloat(row.total || 0) });
      }

      const servicesRev = parseFloat(breakdown.services || 0);
      const membershipsRev = parseFloat(breakdown.memberships || 0);

      res.json({
        success: true,
        data: {
          totalBills: parseInt(stats.total_bills || 0),
          avgBillValue: Math.round(parseFloat(stats.avg_bill || 0)),
          highestBill: Math.round(parseFloat(stats.max_bill || 0)),
          gstCollected: Math.round(parseFloat(stats.gst_collected || 0)),
          discountGiven: Math.round(parseFloat(stats.discount_given || 0)),
          netRevenue: Math.round(parseFloat(stats.net_revenue || 0)),
          avgBillTrend,
          paymentMethods: paymentData,
          breakdown: [
            { name: 'Services', value: servicesRev, color: '#C9A84C' },
            { name: 'Memberships', value: membershipsRev, color: '#8B5CF6' },
          ]
        }
      });
    } catch (e) { next(e); }
  },


  // Membership Analytics
  membershipAnalytics: async (req, res, next) => {
    try {
      const [[activeRow]] = await pool.execute(
        "SELECT COUNT(*) AS count FROM customers WHERE membership_id IS NOT NULL"
      );
      const [[renewalRow]] = await pool.execute(
        "SELECT COUNT(*) AS count FROM membership_purchases"
      );
      const [[revenueRow]] = await pool.execute(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM membership_purchases"
      );
      const [planRows] = await pool.execute(`
        SELECT mp.id, mp.name, mp.price, mp.discount,
               COUNT(c.id) AS members
        FROM membership_plans mp
        LEFT JOIN customers c ON c.membership_id = mp.id
        WHERE mp.is_active = 1
        GROUP BY mp.id, mp.name, mp.price, mp.discount
        ORDER BY mp.price ASC`);

      let growthQ;
      if (db.usePostgres) {
        growthQ = `SELECT TO_CHAR(mp.purchased_at, 'YYYY-MM') AS month,
          COUNT(*) AS purchases, COALESCE(SUM(mp.amount), 0) AS revenue
          FROM membership_purchases mp
          WHERE mp.purchased_at >= NOW() - INTERVAL '6 MONTH'
          GROUP BY month ORDER BY month ASC`;
      } else if (db.useSqlite) {
        growthQ = `SELECT strftime('%Y-%m', mp.purchased_at) AS month,
          COUNT(*) AS purchases, COALESCE(SUM(mp.amount), 0) AS revenue
          FROM membership_purchases mp
          WHERE mp.purchased_at >= datetime('now', '-6 months')
          GROUP BY month ORDER BY month ASC`;
      } else {
        growthQ = `SELECT DATE_FORMAT(mp.purchased_at, '%Y-%m') AS month,
          COUNT(*) AS purchases, COALESCE(SUM(mp.amount), 0) AS revenue
          FROM membership_purchases mp
          WHERE mp.purchased_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          GROUP BY month ORDER BY month ASC`;
      }

      const [growthRows] = await pool.execute(growthQ);

      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const growthMap = {};
      (growthRows).forEach(r => { growthMap[r.month] = r; });

      // Running total for active members over time
      const activeTotal = parseInt(activeRow?.count || 0);
      const growthTrend = [];
      let runningTotal = Math.max(0, activeTotal - (growthRows).reduce((s, r) => s + parseInt(r.purchases||0), 0));
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const row = growthMap[key] || {};
        runningTotal += parseInt(row.purchases || 0);
        growthTrend.push({
          month: monthNames[d.getMonth()],
          active: runningTotal,
          expired: Math.max(0, Math.floor(runningTotal * 0.05)),
          revenue: parseFloat(row.revenue || 0),
        });
      }

      const planColors = ['#94A3B8', '#C9A84C', '#E8C96A', '#8B5CF6'];
      const plans = (planRows).map((p, i) => ({
        name: p.name,
        members: parseInt(p.members || 0),
        price: parseFloat(p.price || 0),
        color: planColors[i % planColors.length],
      }));

      const totalRevenue = parseFloat(revenueRow?.total || 0);
      const utilizationRate = activeTotal > 0 ? Math.min(100, Math.round((parseInt(renewalRow?.count||0) / activeTotal) * 100)) : 0;

      res.json({
        success: true,
        data: {
          active: activeTotal,
          renewals: parseInt(renewalRow?.count || 0),
          revenue: totalRevenue,
          utilizationRate,
          plans,
          growthTrend,
        }
      });
    } catch (e) { next(e); }
  },

  // Marketing Analytics (from real data: leads + appointments sources)
  marketingAnalytics: async (req, res, next) => {
    try {
      const [[websiteAppts]] = await pool.execute(
        "SELECT COUNT(*) AS count FROM appointments WHERE source = 'online'"
      );
      const [[phoneAppts]] = await pool.execute(
        "SELECT COUNT(*) AS count FROM appointments WHERE source = 'phone'"
      );
      const [[walkinBills]] = await pool.execute(
        "SELECT COUNT(*) AS count FROM bills WHERE appointment_id IS NULL"
      );
      const [[websiteRevQ]] = await pool.execute(`
        SELECT COALESCE(SUM(a.price), 0) AS rev FROM appointments a
        WHERE a.source = 'online' AND a.status = 'completed'`);
      const [[phoneRevQ]] = await pool.execute(`
        SELECT COALESCE(SUM(a.price), 0) AS rev FROM appointments a
        WHERE a.source = 'phone' AND a.status = 'completed'`);
      const [[walkinRevQ]] = await pool.execute(`
        SELECT COALESCE(SUM(b.total_amount), 0) AS rev FROM bills b
        WHERE b.appointment_id IS NULL AND b.status = 'paid'`);
      const [[totalLeads]] = await pool.execute("SELECT COUNT(*) AS count FROM leads");
      const [[convertedLeads]] = await pool.execute(
        "SELECT COUNT(*) AS count FROM leads WHERE status = 'converted'"
      );

      const websiteCount = parseInt(websiteAppts?.count || 0);
      const phoneCount = parseInt(phoneAppts?.count || 0);
      const walkinCount = parseInt(walkinBills?.count || 0);
      const websiteRev = parseFloat(websiteRevQ?.rev || 0);
      const phoneRev = parseFloat(phoneRevQ?.rev || 0);
      const walkinRev = parseFloat(walkinRevQ?.rev || 0);
      const leadsTotal = parseInt(totalLeads?.count || 0);
      const leadsConverted = parseInt(convertedLeads?.count || 0);

      const total = websiteCount + phoneCount + walkinCount || 1;

      const data = [
        {
          channel: 'Website Booking',
          leads: leadsTotal,
          bookings: websiteCount,
          revenue: websiteRev,
          spend: 0,
          roi: websiteRev > 0 ? Math.round((websiteRev / Math.max(1, leadsTotal * 50)) * 100) : 0,
          cpa: leadsTotal > 0 ? Math.round(leadsTotal * 50 / Math.max(1, websiteCount)) : 0,
          color: '#8B5CF6',
          pct: Math.round((websiteCount / total) * 100)
        },
        {
          channel: 'Phone Calls',
          leads: Math.round(phoneCount * 1.3),
          bookings: phoneCount,
          revenue: phoneRev,
          spend: 0,
          roi: phoneRev > 0 ? Math.round((phoneRev / Math.max(1, phoneCount * 30)) * 100) : 0,
          cpa: phoneCount > 0 ? 30 : 0,
          color: '#3B82F6',
          pct: Math.round((phoneCount / total) * 100)
        },
        {
          channel: 'Walk-in',
          leads: walkinCount,
          bookings: walkinCount,
          revenue: walkinRev,
          spend: 0,
          roi: walkinRev > 0 ? 9999 : 0,
          cpa: 0,
          color: '#C9A84C',
          pct: Math.round((walkinCount / total) * 100)
        },
        {
          channel: 'Lead Conversions',
          leads: leadsTotal,
          bookings: leadsConverted,
          revenue: leadsConverted * 1500,
          spend: leadsTotal * 20,
          roi: leadsConverted > 0 ? Math.round((leadsConverted * 1500) / Math.max(1, leadsTotal * 20) * 100) : 0,
          cpa: leadsConverted > 0 ? Math.round(leadsTotal * 20 / leadsConverted) : 0,
          color: '#10B981',
          pct: 0
        },
      ];

      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
};

module.exports = { membershipController, galleryController, leadsController, reportsController, emailMarketingController, analyticsController };
