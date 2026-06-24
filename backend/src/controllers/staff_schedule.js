const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// ======================= SHIFTS =======================

const getShifts = async (req, res, next) => {
  try {
    const { start_date, end_date, staff_id } = req.query;
    let query = `
      SELECT ss.*, s.name as staff_name, s.photo as staff_photo
      FROM staff_shifts ss
      JOIN staff s ON ss.staff_id = s.id
      WHERE ss.date >= ? AND ss.date <= ?
    `;
    const params = [start_date || '2000-01-01', end_date || '2099-12-31'];

    if (staff_id) {
      query += ` AND ss.staff_id = ?`;
      params.push(staff_id);
    }
    
    query += ` ORDER BY ss.date ASC, ss.start_time ASC`;

    const [shifts] = await pool.execute(query, params);
    res.json({ success: true, data: shifts });
  } catch (error) {
    next(error);
  }
};

const assignShift = async (req, res, next) => {
  try {
    const { staff_id, date, start_time, end_time, break_start, break_duration, is_off } = req.body;
    
    // Check if shift already exists for this date
    const [existing] = await pool.execute(
      'SELECT id FROM staff_shifts WHERE staff_id = ? AND date = ?',
      [staff_id, date]
    );

    if (existing.length > 0) {
      await pool.execute(
        `UPDATE staff_shifts SET start_time = ?, end_time = ?, break_start = ?, break_duration = ?, is_off = ?
         WHERE id = ?`,
        [start_time, end_time, break_start || null, break_duration || 0, is_off ? 1 : 0, existing[0].id]
      );
    } else {
      await pool.execute(
        `INSERT INTO staff_shifts (id, staff_id, date, start_time, end_time, break_start, break_duration, is_off)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), staff_id, date, start_time, end_time, break_start || null, break_duration || 0, is_off ? 1 : 0]
      );
    }

    res.json({ success: true, message: 'Shift assigned successfully.' });
  } catch (error) {
    next(error);
  }
};

const deleteShift = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM staff_shifts WHERE id = ?', [id]);
    res.json({ success: true, message: 'Shift deleted.' });
  } catch (error) {
    next(error);
  }
};

// ======================= LEAVES =======================

const getLeaves = async (req, res, next) => {
  try {
    const [leaves] = await pool.execute(`
      SELECT sl.*, s.name as staff_name 
      FROM staff_leaves sl
      JOIN staff s ON sl.staff_id = s.id
      ORDER BY sl.start_date DESC
    `);
    res.json({ success: true, data: leaves });
  } catch (error) {
    next(error);
  }
};

const requestLeave = async (req, res, next) => {
  try {
    const { staff_id, type, start_date, end_date, reason } = req.body;
    await pool.execute(
      `INSERT INTO staff_leaves (id, staff_id, type, start_date, end_date, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), staff_id, type, start_date, end_date, reason]
    );
    res.json({ success: true, message: 'Leave requested.' });
  } catch (error) {
    next(error);
  }
};

const updateLeaveStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.execute('UPDATE staff_leaves SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: 'Leave status updated.' });
  } catch (error) {
    next(error);
  }
};

// ======================= ATTENDANCE =======================

const getAttendance = async (req, res, next) => {
  try {
    const { date } = req.query;
    let query = `
      SELECT sa.*, s.name as staff_name 
      FROM staff_attendance sa
      JOIN staff s ON sa.staff_id = s.id
    `;
    const params = [];
    if (date) {
      query += ` WHERE sa.date = ?`;
      params.push(date);
    }
    query += ` ORDER BY sa.date DESC`;
    
    const [attendance] = await pool.execute(query, params);
    res.json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

// ======================= ANALYTICS =======================

const getStaffAnalytics = async (req, res, next) => {
  try {
    // For a specific staff member or all
    const { staff_id } = req.query;
    const today = new Date().toISOString().split('T')[0];

    // Summary queries
    const [presentToday] = await pool.execute('SELECT COUNT(*) as count FROM staff_attendance WHERE date = ? AND check_in IS NOT NULL', [today]);
    const [onLeave] = await pool.execute('SELECT COUNT(DISTINCT staff_id) as count FROM staff_leaves WHERE status = "approved" AND start_date <= ? AND end_date >= ?', [today, today]);
    const [totalStaff] = await pool.execute('SELECT COUNT(*) as count FROM staff WHERE is_active = 1');
    const [todayAppointments] = await pool.execute('SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status NOT IN ("cancelled")', [today]);

    // Utilization logic (Total Booked Hours / Total Scheduled Hours)
    // Simplified for dashboard

    res.json({
      success: true,
      data: {
        present_today: presentToday[0].count,
        on_leave: onLeave[0].count,
        active_shifts: totalStaff[0].count - onLeave[0].count,
        today_appointments: todayAppointments[0].count,
        available_staff: totalStaff[0].count - onLeave[0].count // approx
      }
    });
  } catch (error) {
    next(error);
  }
};


// ======================= AVAILABLE STAFF =======================

const getAvailableStaff = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'date query param required.' });

    // Get all staff with a shift on this date and NOT on approved leave
    const [staffOnShift] = await pool.execute(`
      SELECT s.*, ss.start_time, ss.end_time, ss.break_start, ss.break_duration
      FROM staff_shifts ss
      JOIN staff s ON ss.staff_id = s.id
      WHERE ss.date = ? AND ss.is_off = 0 AND s.is_active = 1
        AND s.id NOT IN (
          SELECT staff_id FROM staff_leaves
          WHERE status = 'approved' AND start_date <= ? AND end_date >= ?
        )
    `, [date, date, date]);

    res.json({ success: true, data: staffOnShift });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getShifts, assignShift, deleteShift,
  getLeaves, requestLeave, updateLeaveStatus,
  getAttendance, getStaffAnalytics, getAvailableStaff
};
