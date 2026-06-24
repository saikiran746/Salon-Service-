const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { pool } = db;
const { deleteFromCloudinary } = require('../middleware/upload');

const getAllStaff = async (req, res, next) => {
  try {
    const { specialization, is_active = 1 } = req.query;
    let where = 'is_active = ?';
    const params = [is_active];
    if (specialization) { where += ' AND specializations LIKE ?'; params.push(`%${specialization}%`); }

    const [staff] = await pool.execute(
      `SELECT id, name, email, phone, gender, experience, specializations, rating, review_count, bio, photo, total_clients, total_revenue, is_active, created_at
       FROM staff WHERE ${where} ORDER BY rating DESC, name ASC`, params
    );
    res.json({ success: true, data: staff });
  } catch (error) { next(error); }
};

const getStaffById = async (req, res, next) => {
  try {
    let query;
    if (db.usePostgres) {
      query = `SELECT s.*,
       (SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT('id', r.id, 'rating', r.rating, 'comment', r.comment, 'customer_name', c.name, 'created_at', r.created_at)), '[]'::json)
        FROM (SELECT * FROM reviews WHERE staff_id = s.id ORDER BY created_at DESC LIMIT 5) r 
        JOIN customers c ON r.customer_id = c.id) AS recent_reviews
       FROM staff s WHERE s.id = ?`;
    } else {
      query = `SELECT s.*,
       (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', r.id, 'rating', r.rating, 'comment', r.comment, 'customer_name', c.name, 'created_at', r.created_at))
        FROM reviews r JOIN customers c ON r.customer_id = c.id WHERE r.staff_id = s.id ORDER BY r.created_at DESC LIMIT 5) AS recent_reviews
       FROM staff s WHERE s.id = ?`;
    }
    const [staff] = await pool.execute(query, [req.params.id]);
    if (!staff.length) return res.status(404).json({ success: false, message: 'Staff not found.' });
    
    const member = staff[0];
    if (member.recent_reviews && typeof member.recent_reviews === 'string') {
      member.recent_reviews = JSON.parse(member.recent_reviews);
    }
    res.json({ success: true, data: member });
  } catch (error) { next(error); }
};

const getStaffAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { period = '30' } = req.query;

    const [staff] = await pool.execute('SELECT * FROM staff WHERE id = ?', [id]);
    if (!staff.length) return res.status(404).json({ success: false, message: 'Staff not found.' });

    let appointmentsQuery, monthlyQuery;
    
    if (db.usePostgres) {
      appointmentsQuery = `SELECT a.*, s.name AS service_name, s.price
        FROM appointments a JOIN services s ON a.service_id = s.id
        WHERE a.staff_id = ? AND a.appointment_date >= CURRENT_DATE - (CAST(? AS INT) * INTERVAL '1 day') AND a.status = 'completed'
        ORDER BY a.appointment_date DESC`;
        
      monthlyQuery = `SELECT TO_CHAR(appointment_date, 'YYYY-MM') AS month,
       COUNT(*) AS appointments, SUM(a.price) AS revenue
       FROM appointments a WHERE a.staff_id = ? AND a.status = 'completed'
       AND a.appointment_date >= CURRENT_DATE - INTERVAL '6 MONTH'
       GROUP BY month ORDER BY month ASC`;
    } else if (useSqlite) {
      appointmentsQuery = `SELECT a.*, s.name AS service_name, s.price
        FROM appointments a JOIN services s ON a.service_id = s.id
        WHERE a.staff_id = ? AND a.appointment_date >= date('now', '-' || ? || ' days') AND a.status = 'completed'
        ORDER BY a.appointment_date DESC`;
        
      monthlyQuery = `SELECT strftime('%Y-%m', appointment_date) AS month,
       COUNT(*) AS appointments, SUM(a.price) AS revenue
       FROM appointments a WHERE a.staff_id = ? AND a.status = 'completed'
       AND a.appointment_date >= date('now', '-6 months')
       GROUP BY month ORDER BY month ASC`;
    } else {
      appointmentsQuery = `SELECT a.*, s.name AS service_name, s.price
        FROM appointments a JOIN services s ON a.service_id = s.id
        WHERE a.staff_id = ? AND a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND a.status = 'completed'
        ORDER BY a.appointment_date DESC`;
        
      monthlyQuery = `SELECT DATE_FORMAT(appointment_date, '%Y-%m') AS month,
       COUNT(*) AS appointments, SUM(a.price) AS revenue
       FROM appointments a WHERE a.staff_id = ? AND a.status = 'completed'
       AND a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY month ORDER BY month ASC`;
    }

    const [appointments] = await pool.execute(appointmentsQuery, [id, period]);

    // Service breakdown
    const serviceMap = {};
    let totalRevenue = 0;
    appointments.forEach(a => {
      if (!serviceMap[a.service_name]) serviceMap[a.service_name] = { count: 0, revenue: 0 };
      serviceMap[a.service_name].count++;
      serviceMap[a.service_name].revenue += parseFloat(a.price);
      totalRevenue += parseFloat(a.price);
    });

    // Monthly breakdown
    const [monthly] = await pool.execute(monthlyQuery, [id]);

    const [ratings] = await pool.execute(
      'SELECT AVG(rating) AS avg_rating, COUNT(*) AS total FROM reviews WHERE staff_id = ?', [id]
    );

    res.json({
      success: true,
      data: {
        staff: staff[0],
        totalAppointments: appointments.length,
        totalRevenue,
        serviceBreakdown: Object.entries(serviceMap).map(([name, data]) => ({ name, ...data })),
        monthlyPerformance: monthly,
        avgRating: ratings[0].avg_rating || 0,
        totalReviews: ratings[0].total,
      },
    });
  } catch (error) { next(error); }
};

const createStaff = async (req, res, next) => {
  try {
    const { name, email, phone, gender, experience, specializations, bio } = req.body;
    const staffId = uuidv4();
    const photo = req.file ? req.file.path : null;
    const photoPublicId = req.file ? req.file.filename : null;

    const [existing] = await pool.execute('SELECT id FROM staff WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ success: false, message: 'Staff with this email already exists.' });

    await pool.execute(
      `INSERT INTO staff (id, name, email, phone, gender, experience, specializations, bio, photo, photo_public_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [staffId, name, email, phone, gender || null, experience, specializations, bio || null, photo, photoPublicId]
    );
    const [newStaff] = await pool.execute('SELECT * FROM staff WHERE id = ?', [staffId]);
    res.status(201).json({ success: true, message: 'Staff added.', data: newStaff[0] });
  } catch (error) { next(error); }
};

const updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute('SELECT * FROM staff WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Staff not found.' });

    const { name, email, phone, gender, experience, specializations, bio, is_active } = req.body;
    const updates = []; const params = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (email) { updates.push('email = ?'); params.push(email); }
    if (phone) { updates.push('phone = ?'); params.push(phone); }
    if (gender) { updates.push('gender = ?'); params.push(gender); }
    if (experience) { updates.push('experience = ?'); params.push(experience); }
    if (specializations) { updates.push('specializations = ?'); params.push(specializations); }
    if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
    if (req.file) {
      if (existing[0].photo_public_id) await deleteFromCloudinary(existing[0].photo_public_id);
      updates.push('photo = ?', 'photo_public_id = ?');
      params.push(req.file.path, req.file.filename);
    }
    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update.' });
    params.push(id);
    await pool.execute(`UPDATE staff SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    const [updated] = await pool.execute('SELECT * FROM staff WHERE id = ?', [id]);
    res.json({ success: true, message: 'Staff updated.', data: updated[0] });
  } catch (error) { next(error); }
};

const deleteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute('SELECT * FROM staff WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Staff not found.' });

    // Admin is allowed to delete/deactivate staff at any time, so the upcoming appointments check is bypassed.


    if (existing[0].photo_public_id) await deleteFromCloudinary(existing[0].photo_public_id);
    await pool.execute('UPDATE staff SET is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Staff removed.' });
  } catch (error) { next(error); }
};

const addReview = async (req, res, next) => {
  try {
    const { staff_id, appointment_id, rating, comment } = req.body;
    const [customer] = await pool.execute('SELECT id FROM customers WHERE user_id = ?', [req.user.id]);
    if (!customer.length) return res.status(404).json({ success: false, message: 'Customer not found.' });

    const [appt] = await pool.execute(
      "SELECT id FROM appointments WHERE id = ? AND customer_id = ? AND staff_id = ? AND status = 'completed'",
      [appointment_id, customer[0].id, staff_id]
    );
    if (!appt.length) return res.status(400).json({ success: false, message: 'Cannot review. No completed appointment found.' });

    const [existing] = await pool.execute('SELECT id FROM reviews WHERE appointment_id = ?', [appointment_id]);
    if (existing.length) return res.status(409).json({ success: false, message: 'You have already reviewed this appointment.' });

    await pool.execute(
      'INSERT INTO reviews (id, staff_id, customer_id, appointment_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), staff_id, customer[0].id, appointment_id, rating, comment || null]
    );

    const [avg] = await pool.execute('SELECT AVG(rating) AS avg, COUNT(*) AS cnt FROM reviews WHERE staff_id = ?', [staff_id]);
    await pool.execute('UPDATE staff SET rating = ?, review_count = ? WHERE id = ?', [avg[0].avg || 0, avg[0].cnt, staff_id]);

    res.status(201).json({ success: true, message: 'Review added. Thank you!' });
  } catch (error) { next(error); }
};

module.exports = { getAllStaff, getStaffById, getStaffAnalytics, createStaff, updateStaff, deleteStaff, addReview };
