const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { pool } = db;
const { deleteFromCloudinary } = require('../middleware/upload');

// Get all services (public)
const getAllServices = async (req, res, next) => {
  try {
    const { category, is_active = 1 } = req.query;
    let where = 'is_active = ?';
    const params = [is_active];

    if (category) { where += ' AND specialist_type = ?'; params.push(category); }

    const [services] = await pool.execute(
      `SELECT * FROM services WHERE ${where} ORDER BY sort_order ASC, name ASC`,
      params
    );
    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
};

// Get service by ID
const getServiceById = async (req, res, next) => {
  try {
    let query;
    if (db.usePostgres) {
      query = `SELECT s.*, 
       STRING_AGG(DISTINCT st.id, ',' ORDER BY st.id) AS staff_ids,
       STRING_AGG(DISTINCT st.name, '||' ORDER BY st.name) AS staff_names
       FROM services s
       LEFT JOIN staff st ON (st.specializations LIKE '%' || s.specialist_type || '%' OR POSITION(s.specialist_type IN st.specializations) > 0) AND st.is_active = 1
       WHERE s.id = ?
       GROUP BY s.id`;
    } else if (useSqlite) {
      query = `SELECT s.*, 
       GROUP_CONCAT(DISTINCT st.id) AS staff_ids,
       GROUP_CONCAT(DISTINCT st.name) AS staff_names
       FROM services s
       LEFT JOIN staff st ON (',' || REPLACE(st.specializations, ', ', ',') || ',' LIKE '%,' || s.specialist_type || ',%') AND st.is_active = 1
       WHERE s.id = ?
       GROUP BY s.id`;
    } else {
      query = `SELECT s.*, 
       GROUP_CONCAT(DISTINCT st.id ORDER BY st.name) AS staff_ids,
       GROUP_CONCAT(DISTINCT st.name ORDER BY st.name SEPARATOR '||') AS staff_names
       FROM services s
       LEFT JOIN staff st ON FIND_IN_SET(s.specialist_type, st.specializations) > 0 AND st.is_active = 1
       WHERE s.id = ?
       GROUP BY s.id`;
    }
    const [services] = await pool.execute(query, [req.params.id]);
    if (services.length === 0) return res.status(404).json({ success: false, message: 'Service not found.' });
    res.json({ success: true, data: services[0] });
  } catch (error) {
    next(error);
  }
};

// Get staff for a service (for booking)
const getServiceStaff = async (req, res, next) => {
  try {
    const [service] = await pool.execute('SELECT specialist_type FROM services WHERE id = ?', [req.params.id]);
    if (service.length === 0) return res.status(404).json({ success: false, message: 'Service not found.' });

    let query, params;
    if (db.usePostgres) {
      query = `SELECT st.id, st.name, st.photo, st.experience, st.rating, st.review_count, st.specializations, st.bio
       FROM staff st
       WHERE st.is_active = 1 
       AND (st.specializations LIKE '%' || ? || '%' OR POSITION(? IN st.specializations) > 0)
       ORDER BY st.rating DESC`;
      params = [service[0].specialist_type, service[0].specialist_type];
    } else if (db.useSqlite) {
      query = `SELECT st.id, st.name, st.photo, st.experience, st.rating, st.review_count, st.specializations, st.bio
       FROM staff st
       WHERE st.is_active = 1 
       AND (',' || REPLACE(st.specializations, ', ', ',') || ',' LIKE '%,' || ? || ',%')
       ORDER BY st.rating DESC`;
      params = [service[0].specialist_type];
    } else {
      query = `SELECT st.id, st.name, st.photo, st.experience, st.rating, st.review_count, st.specializations, st.bio
       FROM staff st
       WHERE st.is_active = 1 
       AND (FIND_IN_SET(?, st.specializations) > 0 OR st.specializations LIKE ?)
       ORDER BY st.rating DESC`;
      params = [service[0].specialist_type, `%${service[0].specialist_type}%`];
    }

    const [staff] = await pool.execute(query, params);
    res.json({ success: true, data: staff });
  } catch (error) {
    next(error);
  }
};

// Create service (admin)
const createService = async (req, res, next) => {
  try {
    const { name, description, duration, price, specialist_type, category, sort_order, gender } = req.body;
    const serviceId = uuidv4();
    const image = req.file ? req.file.path : null;
    const imagePublicId = req.file ? req.file.filename : null;

    await pool.execute(
      `INSERT INTO services (id, name, description, duration, price, specialist_type, category, image, image_public_id, sort_order, gender)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [serviceId, name, description, duration, price, specialist_type, category || 'general', image, imagePublicId, sort_order || 0, gender || 'Both']
    );

    const [service] = await pool.execute('SELECT * FROM services WHERE id = ?', [serviceId]);
    res.status(201).json({ success: true, message: 'Service created.', data: service[0] });
  } catch (error) {
    next(error);
  }
};

// Update service (admin)
const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute('SELECT * FROM services WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Service not found.' });

    const { name, description, duration, price, specialist_type, category, is_active, sort_order, gender } = req.body;
    const updates = [];
    const params = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (duration) { updates.push('duration = ?'); params.push(duration); }
    if (price) { updates.push('price = ?'); params.push(price); }
    if (specialist_type) { updates.push('specialist_type = ?'); params.push(specialist_type); }
    if (category) { updates.push('category = ?'); params.push(category); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }
    if (gender) { updates.push('gender = ?'); params.push(gender); }

    if (req.file) {
      if (existing[0].image_public_id) await deleteFromCloudinary(existing[0].image_public_id);
      updates.push('image = ?', 'image_public_id = ?');
      params.push(req.file.path, req.file.filename);
    }

    if (updates.length === 0) return res.status(400).json({ success: false, message: 'No fields to update.' });
    params.push(id);
    await pool.execute(`UPDATE services SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);

    const [updated] = await pool.execute('SELECT * FROM services WHERE id = ?', [id]);
    res.json({ success: true, message: 'Service updated.', data: updated[0] });
  } catch (error) {
    next(error);
  }
};

// Delete service (admin)
const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute('SELECT * FROM services WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Service not found.' });

    // Check for future appointments
    const query = db.usePostgres 
      ? "SELECT COUNT(*) AS count FROM appointments WHERE service_id = ? AND appointment_date >= CURRENT_DATE AND status NOT IN ('cancelled')"
      : "SELECT COUNT(*) AS count FROM appointments WHERE service_id = ? AND appointment_date >= CURDATE() AND status NOT IN ('cancelled')";

    const [appts] = await pool.execute(query, [id]);
    if (appts[0].count > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete service with upcoming appointments.' });
    }

    if (existing[0].image_public_id) await deleteFromCloudinary(existing[0].image_public_id);
    await pool.execute('UPDATE services SET is_active = 0 WHERE id = ?', [id]);

    res.json({ success: true, message: 'Service deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Bulk update categories for multiple services
const updateBulkCategory = async (req, res, next) => {
  try {
    const { category, serviceIds } = req.body;
    if (!category || !Array.isArray(serviceIds)) {
      return res.status(400).json({ success: false, message: 'Valid category and serviceIds array are required.' });
    }

    if (serviceIds.length > 0) {
      // Prepare placeholders for IN clause
      const placeholders = serviceIds.map(() => '?').join(',');
      const query = `UPDATE services SET category = ?, updated_at = NOW() WHERE id IN (${placeholders})`;
      
      await pool.execute(query, [category, ...serviceIds]);
    }

    res.json({ success: true, message: `Successfully updated category to ${category}.` });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllServices, getServiceById, getServiceStaff, createService, updateService, deleteService, updateBulkCategory };
