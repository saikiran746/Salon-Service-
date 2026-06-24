const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { sendEmail } = require('../utils/email');

const enrichAppointments = async (appointments) => {
  if (!appointments || appointments.length === 0) return appointments;
  
  try {
    // Fetch all services to build map
    const [allServices] = await pool.execute('SELECT id, name, price, duration FROM services');
    const serviceMap = {};
    allServices.forEach(s => {
      serviceMap[s.id] = s;
    });
    
    return appointments.map(appt => {
      let apptServiceIds = [];
      if (appt.service_ids) {
        try {
          apptServiceIds = typeof appt.service_ids === 'string' ? JSON.parse(appt.service_ids) : appt.service_ids;
        } catch (e) {
          apptServiceIds = [appt.service_id];
        }
      } else {
        apptServiceIds = [appt.service_id];
      }
      
      if (!Array.isArray(apptServiceIds)) {
        apptServiceIds = [appt.service_id];
      }
      
      const apptServices = apptServiceIds.map(id => serviceMap[id]).filter(Boolean);
      
      if (apptServices.length > 0) {
        appt.services = apptServices;
        appt.service_name = apptServices.map(s => s.name).join(', ');
        // We use the database price/duration if present, but fallback to computed.
        appt.duration = appt.duration !== undefined && appt.duration !== null ? appt.duration : apptServices.reduce((sum, s) => sum + s.duration, 0);
        appt.price = appt.price !== undefined && appt.price !== null ? appt.price : apptServices.reduce((sum, s) => sum + parseFloat(s.price), 0);
      }
      return appt;
    });
  } catch (err) {
    console.error('Error enriching appointments:', err);
    return appointments;
  }
};

// Create appointment
const createAppointment = async (req, res, next) => {
  try {
    const { service_id, service_ids, staff_id, appointment_date, appointment_time, notes, customer_id, customer_name, customer_phone } = req.body;

    if (customer_name && /[0-9]/.test(customer_name)) {
      return res.status(400).json({ success: false, message: 'Customer name must contain only letters and spaces.' });
    }

    const userId = req.user?.role === 'customer' ? req.user.id : null;

    // Get customer info
    let customerId = customer_id;
    if (!customerId && userId) {
      const [cust] = await pool.execute('SELECT id FROM customers WHERE user_id = ?', [userId]);
      if (cust.length > 0) customerId = cust[0].id;
    }

    // Try to find or create customer if name is typed manually (e.g. walk-in booking by admin)
    if (!customerId && customer_name) {
      if (customer_phone) {
        const [existingCust] = await pool.execute('SELECT id FROM customers WHERE phone = ?', [customer_phone]);
        if (existingCust.length > 0) {
          customerId = existingCust[0].id;
        }
      }
      if (!customerId) {
        customerId = uuidv4();
        await pool.execute(
          "INSERT INTO customers (id, name, phone, source) VALUES (?, ?, ?, 'walk_in')",
          [customerId, customer_name, customer_phone || null]
        );
      }
    }

    // Save phone number to profile if it was previously empty
    if (customerId && customer_phone) {
      await pool.execute("UPDATE customers SET phone = ? WHERE id = ? AND (phone IS NULL OR phone = '')", [customer_phone, customerId]);
    }

    // Closed Days Validation
    if (appointment_date) {
      try {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = dayNames[new Date(appointment_date).getDay()];
        
        const [settings] = await pool.execute('SELECT closed_days FROM site_settings LIMIT 1');
        if (settings.length > 0 && settings[0].closed_days) {
          const closedDays = JSON.parse(settings[0].closed_days || '[]');
          if (Array.isArray(closedDays) && closedDays.includes(dayOfWeek)) {
            return res.status(400).json({ 
              success: false, 
              message: `The salon is closed on ${dayOfWeek}s. We would be absolutely delighted to welcome you on another available date.` 
            });
          }
        }
      } catch (err) {
        console.warn('Error checking closed days:', err.message);
      }
    }

    // Closed Slots Validation
    if (appointment_time) {
      try {
        const [settings] = await pool.execute('SELECT closed_slots FROM site_settings LIMIT 1');
        if (settings.length > 0 && settings[0].closed_slots) {
          const closedSlots = JSON.parse(settings[0].closed_slots || '[]');
          const timeKey = appointment_time.substring(0, 5); // e.g. "13:00"
          if (Array.isArray(closedSlots) && closedSlots.includes(timeKey)) {
            return res.status(400).json({ 
              success: false, 
              message: `The selected time slot is closed for bookings. Please choose another.` 
            });
          }
        }
      } catch (err) {
        console.warn('Error checking closed slots:', err.message);
      }
    }

    // Skip staff schedule and leaves checks as requested

    const staffIdVal = staff_id && staff_id.trim() !== '' ? staff_id : null;

    if (staffIdVal) {
      const [conflicts] = await pool.execute(
        `SELECT id FROM appointments 
         WHERE staff_id = ? AND appointment_date = ? AND appointment_time = ? 
         AND status NOT IN ('cancelled', 'no_show')`,
        [staffIdVal, appointment_date, appointment_time]
      );

      if (conflicts.length > 0) {
        return res.status(409).json({ success: false, message: 'This time slot is already booked. Please choose another.' });
      }
    }

    // Resolve service details for selected services
    let targetServiceIds = [];
    if (Array.isArray(service_ids) && service_ids.length > 0) {
      targetServiceIds = service_ids;
    } else if (service_id) {
      targetServiceIds = [service_id];
    } else {
      return res.status(400).json({ success: false, message: 'At least one service is required.' });
    }

    const placeholders = targetServiceIds.map(() => '?').join(',');
    const [fetchedServices] = await pool.execute(
      `SELECT id, name, price, duration FROM services WHERE id IN (${placeholders})`,
      targetServiceIds
    );

    if (fetchedServices.length === 0) {
      return res.status(404).json({ success: false, message: 'Selected services not found.' });
    }

    const totalDuration = fetchedServices.reduce((sum, s) => sum + s.duration, 0);
    const totalPrice = fetchedServices.reduce((sum, s) => sum + parseFloat(s.price), 0);
    const primaryServiceId = targetServiceIds[0];
    const serviceIdsJson = JSON.stringify(targetServiceIds);

    // Duplicate Booking Prevention (Backend Validation)
    if (customerId) {
      const [duplicates] = await pool.execute(
        `SELECT id FROM appointments 
         WHERE customer_id = ? AND appointment_date = ? AND appointment_time = ? AND service_id = ? 
         AND status NOT IN ('cancelled', 'no_show')`,
        [customerId, appointment_date, appointment_time, primaryServiceId]
      );
      if (duplicates.length > 0) {
        return res.status(409).json({ success: false, message: 'Appointment already booked for this slot.' });
      }
    }

    const appointmentId = uuidv4();
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const isOnline = req.body.source === 'online';

    await pool.execute(
      `INSERT INTO appointments (id, customer_id, service_id, service_ids, staff_id, appointment_date, appointment_time, duration, price, notes, status, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [appointmentId, customerId, primaryServiceId, serviceIdsJson, staffIdVal, appointment_date, appointment_time, totalDuration, totalPrice, notes || null, isOnline ? 'pending' : (isAdmin ? 'confirmed' : 'pending'), isOnline ? 'online' : (isAdmin ? 'phone' : 'online')]
    );

    // Build enriched notification message
    let custName = customer_name || 'Walk-in';
    let custEmail = '';
    let custPhone = customer_phone || '';
    if (customerId) {
      const [custInfo] = await pool.execute('SELECT name, email, phone FROM customers WHERE id = ?', [customerId]);
      if (custInfo.length > 0) {
        custName = custInfo[0].name || custName;
        custEmail = custInfo[0].email || '';
        custPhone = custInfo[0].phone || custPhone;
      }
    }
    if (!isAdmin) {
      await pool.execute(
        'INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), 'ADMIN', 'New Appointment Request', `Appointment requested for ${appointment_date} at ${appointment_time}.||${appointmentId}||${custName}||${custEmail}||${custPhone}||${appointment_date}||${appointment_time}`, 'appointment']
      );
    }

    // Only send confirmation email if it is already confirmed (e.g. by Admin)
    const statusVal = isOnline ? 'pending' : (isAdmin ? 'confirmed' : 'pending');
    if (customerId && statusVal === 'confirmed') {
      const [custData] = await pool.execute('SELECT name, email FROM customers WHERE id = ?', [customerId]);
      if (custData.length > 0 && custData[0].email) {
        const [staffData] = staffIdVal ? await pool.execute('SELECT name FROM staff WHERE id = ?', [staffIdVal]) : [[[]]];
        const servicesNames = fetchedServices.map(s => s.name).join(', ');
        await sendEmail({
          to: custData[0].email,
          subject: 'Appointment Confirmed - Luxe Salon',
          template: 'appointment-confirmation',
          data: {
            name: custData[0].name,
            service: servicesNames,
            staff: staffData[0]?.name || 'Unassigned',
            date: appointment_date,
            time: appointment_time,
          },
        }).catch(err => console.error('Email send error:', err));
      }
    }

    const [newAppt] = await pool.execute(
      `SELECT a.*, s.name AS service_name, st.name AS staff_name, c.name AS customer_name
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       LEFT JOIN staff st ON a.staff_id = st.id
       LEFT JOIN customers c ON a.customer_id = c.id
       WHERE a.id = ?`,
      [appointmentId]
    );

    const enriched = await enrichAppointments(newAppt);

    res.status(201).json({ success: true, message: 'Appointment booked successfully.', data: enriched[0] });
  } catch (error) {
    next(error);
  }
};

// Get appointment by ID
const getAppointmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [appointment] = await pool.execute(
      `SELECT a.*, s.name AS service_name, s.price AS service_price,
       st.name AS staff_name, st.photo AS staff_photo,
       c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       LEFT JOIN staff st ON a.staff_id = st.id
       LEFT JOIN customers c ON a.customer_id = c.id
       WHERE a.id = ?`,
      [id]
    );
    if (appointment.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found' });
    const enriched = await enrichAppointments(appointment);
    res.json({ success: true, data: enriched[0] });
  } catch (error) {
    next(error);
  }
};

// Get all appointments (admin)
const getAllAppointments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, date, staff_id, customer_id, search } = req.query;
    const offset = (page - 1) * limit;

    // Filter out legacy fake appointments created by billing
    let where = "a.source != 'walk-in'";
    const params = [];

    if (status) { where += ' AND a.status = ?'; params.push(status); }
    if (date) { where += ' AND a.appointment_date = ?'; params.push(date); }
    if (staff_id) { where += ' AND a.staff_id = ?'; params.push(staff_id); }
    if (customer_id) { where += ' AND a.customer_id = ?'; params.push(customer_id); }
    if (search) {
      where += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [appointments] = await pool.execute(
      `SELECT a.*, s.name AS service_name, s.price AS service_price,
       st.name AS staff_name, st.photo AS staff_photo,
       c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       LEFT JOIN staff st ON a.staff_id = st.id
       LEFT JOIN customers c ON a.customer_id = c.id
       WHERE ${where}
       ORDER BY a.appointment_date DESC, a.appointment_time DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) AS count FROM appointments a
       JOIN services s ON a.service_id = s.id
       LEFT JOIN staff st ON a.staff_id = st.id
       LEFT JOIN customers c ON a.customer_id = c.id
       WHERE ${where}`,
      params
    );

    const enriched = await enrichAppointments(appointments);

    res.json({
      success: true,
      data: enriched,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: total[0].count, pages: Math.ceil(total[0].count / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// Get customer's appointments
const getMyAppointments = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [customer] = await pool.execute('SELECT * FROM customers WHERE user_id = ?', [req.user.id]);
    if (customer.length === 0) return res.status(404).json({ success: false, message: 'Customer profile not found.' });

    const cust = customer[0];
    const email = cust.email ? cust.email.trim() : '';
    const phone = cust.phone ? cust.phone.replace(/\D/g, '').trim() : '';
    
    let queryConditions = ['a.customer_id = ?'];
    let params = [cust.id];

    if (phone) {
      const [matchedCusts] = await pool.execute('SELECT id FROM customers WHERE phone LIKE ?', [`%${phone.slice(-10)}`]);
      matchedCusts.forEach(c => {
        if (!params.includes(c.id)) {
          queryConditions.push('a.customer_id = ?');
          params.push(c.id);
        }
      });
    }

    if (email && !email.includes('@luxesalon.local')) {
      const [matchedCusts] = await pool.execute('SELECT id FROM customers WHERE LOWER(email) = LOWER(?)', [email]);
      matchedCusts.forEach(c => {
        if (!params.includes(c.id)) {
          queryConditions.push('a.customer_id = ?');
          params.push(c.id);
        }
      });
    }

    let where = `(${queryConditions.join(' OR ')})`;
    if (status) { where += ' AND a.status = ?'; params.push(status); }

    const [appointments] = await pool.execute(
      `SELECT a.*, s.name AS service_name, s.image AS service_image, s.duration,
       st.name AS staff_name, st.photo AS staff_photo
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       LEFT JOIN staff st ON a.staff_id = st.id
       WHERE ${where}
       ORDER BY a.appointment_date DESC, a.appointment_time DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) AS count FROM appointments a WHERE ${where}`, params
    );

    const enriched = await enrichAppointments(appointments);

    res.json({ success: true, data: enriched, pagination: { page: parseInt(page), limit: parseInt(limit), total: total[0].count } });
  } catch (error) {
    next(error);
  }
};

// Update appointment status
const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, appointment_date, appointment_time, notes, staff_id } = req.body;

    const [existing] = await pool.execute('SELECT * FROM appointments WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found.' });

    const updates = [];
    const params = [];

    const isStatusChanged = status && status !== existing[0].status;

    if (status) { updates.push('status = ?'); params.push(status); }
    if (appointment_date) { updates.push('appointment_date = ?'); params.push(appointment_date); }
    if (appointment_time) { updates.push('appointment_time = ?'); params.push(appointment_time); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (staff_id) { updates.push('staff_id = ?'); params.push(staff_id); }

    // If completed directly from appointments screen, automatically generate the bill and link it
    if (status === 'completed' && existing[0].status !== 'completed' && !existing[0].bill_id) {
      const appt = existing[0];
      const billId = uuidv4();
      const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000) + 1000}`;
      const amount = parseFloat(appt.price || 0);

      let createdAtStr = new Date().toISOString();
      if (appt.appointment_date) {
        const datePart = typeof appt.appointment_date === 'string' 
          ? appt.appointment_date.split('T')[0] 
          : appt.appointment_date.toISOString().split('T')[0];
        const timePart = appt.appointment_time || '12:00:00';
        createdAtStr = `${datePart}T${timePart}`;
      }

      await pool.execute(
        `INSERT INTO bills (id, invoice_number, appointment_id, customer_id, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total_amount, payment_method, status, created_at)
         VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?, 'cash', 'paid', ?)`,
        [billId, invoiceNumber, appt.id, appt.customer_id, amount, amount, createdAtStr]
      );

      const [svc] = await pool.execute('SELECT name FROM services WHERE id = ?', [appt.service_id]);
      const [staff] = appt.staff_id ? await pool.execute('SELECT name FROM staff WHERE id = ?', [appt.staff_id]) : [[[]]];
      const descName = svc[0]?.name || 'Salon Service';
      const staffName = staff[0]?.name || '';
      const description = staffName ? `${descName} (${staffName})` : descName;

      await pool.execute(
        `INSERT INTO bill_items (id, bill_id, description, quantity, unit_price, total_price)
         VALUES (?, ?, ?, 1, ?, ?)`,
        [uuidv4(), billId, description, amount, amount]
      );

      updates.push('bill_id = ?');
      params.push(billId);
    }

    if (updates.length === 0) return res.status(400).json({ success: false, message: 'No fields to update.' });

    params.push(id);
    await pool.execute(`UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`, params);

    const [apptData] = await pool.execute(
      'SELECT a.*, c.name, c.email, c.phone FROM appointments a LEFT JOIN customers c ON a.customer_id = c.id WHERE a.id = ?',
      [id]
    );
    const a = apptData[0] || {};
    const statusText = status ? ` marked as ${status}` : ' updated';
    const messageStr = `Appointment ID ${id.substring(0,6)}${statusText}.||${id}||${a.name || 'Walk-in'}||${a.email || ''}||${a.phone || ''}||${a.appointment_date}||${a.appointment_time}`;

    if (isStatusChanged || (!status && (appointment_date || appointment_time))) {
      await pool.execute(
        'INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), 'ADMIN', status === 'cancelled' ? 'Appointment Cancelled' : 'Appointment Updated', messageStr, 'appointment']
      );
    }

    const isRescheduled = (appointment_date && appointment_date !== existing[0].appointment_date) || 
                          (appointment_time && appointment_time !== existing[0].appointment_time);

    // Send status update or reschedule email
    if ((isStatusChanged && (status === 'confirmed' || status === 'cancelled')) || isRescheduled) {
      const appt = existing[0];
      const [custData] = await pool.execute('SELECT name, email FROM customers WHERE id = ?', [appt.customer_id]);
      const [svcData] = await pool.execute('SELECT name FROM services WHERE id = ?', [appt.service_id]);
      const [staffData] = await pool.execute('SELECT name FROM staff WHERE id = ?', [staff_id || appt.staff_id]);

      if (custData.length > 0 && custData[0].email) {
        let subject = '';
        let template = '';
        
        if (status === 'confirmed') {
          subject = 'Appointment Confirmed - Luxe Salon ✓';
          template = 'appointment-confirmation';
        } else if (status === 'cancelled') {
          subject = 'Appointment Cancelled/Rejected - Luxe Salon';
          template = 'appointment-cancelled';
        } else {
          subject = 'Appointment Rescheduled - Luxe Salon';
          template = 'appointment-rescheduled';
        }

        await sendEmail({
          to: custData[0].email,
          subject,
          template,
          data: {
            name: custData[0].name,
            service: svcData[0]?.name,
            staff: staffData[0]?.name,
            date: appointment_date || appt.appointment_date,
            time: appointment_time || appt.appointment_time,
          },
        }).catch(err => console.error('Failed to send status update email:', err));
      }
    }

    // If completed (and wasn't completed before), update customer and staff stats
    if (status === 'completed' && existing[0].status !== 'completed') {
      const appt = existing[0];
      await pool.execute(
        'UPDATE customers SET total_visits = total_visits + 1, total_spent = total_spent + ?, last_visit = NOW() WHERE id = ?',
        [appt.price, appt.customer_id]
      );
      if (appt.staff_id) {
        await pool.execute(
          'UPDATE staff SET total_clients = total_clients + 1, total_revenue = total_revenue + ? WHERE id = ?',
          [appt.price, appt.staff_id]
        );
      }
    }

    const [updated] = await pool.execute(
      `SELECT a.*, s.name AS service_name, st.name AS staff_name, c.name AS customer_name
       FROM appointments a
       JOIN services s ON a.service_id = s.id LEFT JOIN staff st ON a.staff_id = st.id LEFT JOIN customers c ON a.customer_id = c.id
       WHERE a.id = ?`,
      [id]
    );

    const enriched = await enrichAppointments(updated);

    res.json({ success: true, message: 'Appointment updated.', data: enriched[0] });
  } catch (error) {
    next(error);
  }
};

// Cancel appointment (customer)
const cancelAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [customer] = await pool.execute('SELECT id FROM customers WHERE user_id = ?', [req.user.id]);

    const [appt] = await pool.execute('SELECT * FROM appointments WHERE id = ? AND customer_id = ?', [id, customer[0].id]);
    if (appt.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found.' });

    if (['cancelled', 'completed'].includes(appt[0].status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel a ${appt[0].status} appointment.` });
    }

    // Check if cancellation is within 2 hours
    const apptDateTime = new Date(`${appt[0].appointment_date} ${appt[0].appointment_time}`);
    const hoursUntil = (apptDateTime - new Date()) / (1000 * 60 * 60);
    if (hoursUntil < 2) {
      return res.status(400).json({ success: false, message: 'Appointments cannot be cancelled within 2 hours of the scheduled time.' });
    }

    await pool.execute("UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = ?", [id]);

    const [custData] = await pool.execute('SELECT name, email, phone FROM customers WHERE id = ?', [customer[0].id]);
    const cust = custData[0] || {};
    const messageStr = `Appointment has been cancelled.||${id}||${cust.name || ''}||${cust.email || ''}||${cust.phone || ''}||${appt[0].appointment_date}||${appt[0].appointment_time}`;

    await pool.execute(
      'INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), 'ADMIN', 'Appointment Cancelled', messageStr, 'appointment']
    );
    res.json({ success: true, message: 'Appointment cancelled successfully.' });
  } catch (error) {
    next(error);
  }
};

// Helper: build time slots for a day based on admin-configured interval
const buildDaySlots = (intervalMinutes) => {
  const slots = [];
  const startHour = 9;   // 09:00
  const endHour = 20;    // up to but not including 20:00
  const totalMinutes = (endHour - startHour) * 60;
  for (let m = 0; m < totalMinutes; m += intervalMinutes) {
    const h = startHour + Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`);
  }
  return slots;
};

// Get available time slots
const getAvailableSlots = async (req, res, next) => {
  try {
    const { staff_id, date, service_id } = req.query;

    const [service] = await pool.execute('SELECT duration FROM services WHERE id = ?', [service_id]);
    if (service.length === 0) return res.status(404).json({ success: false, message: 'Service not found.' });

    // Read slot_interval and closed_slots from site settings
    let slotInterval = 30;
    let closedSlots = [];
    try {
      const [settings] = await pool.execute('SELECT slot_interval, closed_slots FROM site_settings LIMIT 1');
      if (settings.length > 0) {
        if (settings[0].slot_interval) slotInterval = parseInt(settings[0].slot_interval, 10) || 30;
        if (settings[0].closed_slots) closedSlots = JSON.parse(settings[0].closed_slots || '[]');
      }
    } catch (err) {
      console.warn('Error fetching site settings for slots:', err.message);
    }

    const allSlots = buildDaySlots(slotInterval);
    let availableSlots = allSlots;

    if (closedSlots.length > 0) {
      availableSlots = availableSlots.filter(slot => !closedSlots.includes(slot.substring(0, 5)));
    }

    const [booked] = await pool.execute(
      `SELECT appointment_time FROM appointments 
       WHERE staff_id = ? AND appointment_date = ? AND status NOT IN ('cancelled', 'no_show')`,
      [staff_id, date]
    );

    const bookedTimes = booked.map(b => b.appointment_time);
    const available = availableSlots.filter(slot => !bookedTimes.includes(slot));

    res.json({ success: true, data: available, slotInterval });
  } catch (error) {
    next(error);
  }
};

const getSmartRecommendations = async (req, res, next) => {
  try {
    const { date, service_id } = req.query;
    const [staffList] = await pool.execute('SELECT * FROM staff WHERE is_active = 1');

    // Read slot_interval and closed_slots from site settings
    let slotInterval = 30;
    let closedSlots = [];
    try {
      const [settings] = await pool.execute('SELECT slot_interval, closed_slots FROM site_settings LIMIT 1');
      if (settings.length > 0) {
        if (settings[0].slot_interval) slotInterval = parseInt(settings[0].slot_interval, 10) || 30;
        if (settings[0].closed_slots) closedSlots = JSON.parse(settings[0].closed_slots || '[]');
      }
    } catch (err) {
      console.warn('Error fetching site settings for smart recommendations:', err.message);
    }

    // Fetch all booked appointments for this date in a single query
    const [bookedList] = await pool.execute(
      `SELECT staff_id, appointment_time FROM appointments 
       WHERE appointment_date = ? AND status NOT IN ('cancelled', 'no_show')`,
      [date]
    );

    const bookedMap = {};
    bookedList.forEach(b => {
      if (!bookedMap[b.staff_id]) bookedMap[b.staff_id] = [];
      bookedMap[b.staff_id].push(b.appointment_time);
    });

    const recommendations = [];
    for (let st of staffList) {
      const allSlots = buildDaySlots(slotInterval);
      let availableSlots = [...allSlots];

      if (closedSlots.length > 0) {
        availableSlots = availableSlots.filter(s => !closedSlots.includes(s.substring(0, 5)));
      }

      const now = new Date();
      const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      if (date === todayStr) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        availableSlots = availableSlots.filter(s => {
          const [h, m] = s.split(':').map(Number);
          return h > currentHour || (h === currentHour && m > currentMinute);
        });
      }

      const bookedTimes = bookedMap[st.id] || [];
      availableSlots = availableSlots.filter(s => !bookedTimes.includes(s));

      if (availableSlots.length > 0) {
        recommendations.push({
          staff: st,
          availableSlots,
          todayAppointmentsCount: bookedTimes.length,
          utilization: Math.round((bookedTimes.length / allSlots.length) * 100) || 0
        });
      }
    }

    recommendations.sort((a, b) => a.utilization - b.utilization);
    res.json({ success: true, data: recommendations });
  } catch (err) {
    next(err);
  }
};

// Get today's appointments (admin dashboard)
const getTodayAppointments = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [appointments] = await pool.execute(
      `SELECT a.*, s.name AS service_name, st.name AS staff_name, c.name AS customer_name
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       LEFT JOIN staff st ON a.staff_id = st.id
       LEFT JOIN customers c ON a.customer_id = c.id
       WHERE a.appointment_date = ?
       ORDER BY a.appointment_time ASC`,
      [today]
    );
    const enriched = await enrichAppointments(appointments);
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

module.exports = { createAppointment, getAppointmentById, getAllAppointments, getMyAppointments, updateAppointment, cancelAppointment, getAvailableSlots, getTodayAppointments, getSmartRecommendations };
