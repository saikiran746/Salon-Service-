const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { pool } = db;

// Helper to build date interval clause for all 3 DBs
function intervalClause(field, days) {
  if (db.usePostgres) return `${field} >= NOW() - INTERVAL '${days} DAY'`;
  if (db.useSqlite)  return `${field} >= datetime('now', '-${days} days')`;
  return `${field} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`;
}

const getAllCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, type, membership, period, lost, returning, new_only } = req.query;
    const offset = (page - 1) * limit;

    let where = '1=1';
    const params = [];

    if (search) {
      where += ' AND (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (type === 'online') { where += ' AND c.source = "online"'; }
    if (type === 'walk_in') { where += ' AND c.source = "walk_in"'; }
    if (membership === 'yes') {
      where += ` AND c.id IN (
        SELECT MAX(c2.id) FROM customers c2 
        WHERE c2.membership_id IS NOT NULL 
        GROUP BY CASE WHEN c2.phone IS NOT NULL AND c2.phone != '' THEN c2.phone ELSE c2.id END
      )`;
    }
    if (membership === 'no') { where += ' AND c.membership_id IS NULL'; }
    if (period === '30')  { where += ` AND ${intervalClause('c.created_at', 30)}`; }
    if (period === '90')  { where += ` AND ${intervalClause('c.created_at', 90)}`; }
    if (period === '180') { where += ` AND ${intervalClause('c.created_at', 180)}`; }
    if (period === '365') { where += ` AND ${intervalClause('c.created_at', 365)}`; }
    
    if (returning === 'true') {
      where += ` AND (SELECT COUNT(*) FROM bills WHERE customer_id = c.id AND status = 'paid') > 1`;
    }

    if (new_only === 'true') {
      where += ` AND (SELECT COUNT(*) FROM bills WHERE customer_id = c.id AND status = 'paid') = 1`;
    }

    // Lost clients: has at least 1 completed visit but last one was 90+ days ago
    if (lost === 'true') {
      const ninetyDaysAgo = db.useSqlite
        ? `datetime('now', '-90 days')`
        : db.usePostgres
        ? `NOW() - INTERVAL '90 DAY'`
        : `DATE_SUB(NOW(), INTERVAL 90 DAY)`;

      where += ` AND c.total_visits > 0 AND (c.last_visit < ${ninetyDaysAgo} OR (c.last_visit IS NULL AND c.created_at < ${ninetyDaysAgo}))`;
    }

    // If fetching lost clients, enrich with last appointment info
    const selectExtra = lost === 'true'
      ? `,
        (SELECT MAX(a.appointment_date) FROM appointments a WHERE a.customer_id = c.id AND a.status = 'completed') AS last_appointment_date,
        (SELECT s.name FROM appointments a JOIN services s ON a.service_id = s.id WHERE a.customer_id = c.id AND a.status = 'completed' ORDER BY a.appointment_date DESC LIMIT 1) AS last_service_name,
        (SELECT invoice_number FROM bills WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) AS latest_invoice_number,
        (SELECT COUNT(*) FROM appointments a WHERE a.customer_id = c.id AND a.status = 'completed') AS completed_appointments,
        (SELECT COUNT(*) FROM bills WHERE customer_id = c.id AND status = 'paid') AS visit_count`
      : `,
        (SELECT COUNT(*) FROM appointments a WHERE a.customer_id = c.id AND a.status = 'completed') AS completed_appointments,
        (SELECT invoice_number FROM bills WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) AS latest_invoice_number,
        (SELECT COUNT(*) FROM bills WHERE customer_id = c.id AND status = 'paid') AS visit_count`;

    const [customers] = await pool.execute(
      `SELECT c.*, mp.name AS membership_name, mp.discount AS membership_discount${selectExtra}
       FROM customers c LEFT JOIN membership_plans mp ON c.membership_id = mp.id
       WHERE ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [total] = await pool.execute(`SELECT COUNT(*) AS count FROM customers c WHERE ${where}`, params);

    if (customers.length === 0 && search) {
      const trimmedSearch = search.trim();
      const cleanPhone = trimmedSearch.replace(/\D/g, '');
      const phone = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : '';
      const email = trimmedSearch.toLowerCase().includes('@') ? trimmedSearch.toLowerCase() : '';

      if (phone || email) {
        let foundName = '';
        let foundEmail = '';
        let foundPhone = phone;

        // 1. Check users table (website registered accounts)
        let userQuery = 'SELECT name, email, phone FROM users WHERE 1=0';
        let userParams = [];
        if (phone) {
          userQuery = 'SELECT name, email, phone FROM users WHERE phone LIKE ? LIMIT 1';
          userParams = [`%${phone}`];
        } else if (email) {
          userQuery = 'SELECT name, email, phone FROM users WHERE email = ? LIMIT 1';
          userParams = [email];
        }
        const [users] = await pool.execute(userQuery, userParams);
        if (users.length > 0) {
          foundName = users[0].name;
          foundEmail = users[0].email;
          if (users[0].phone) {
            foundPhone = users[0].phone.replace(/\D/g, '').slice(-10);
          }
        }

        // 2. Check leads table
        if (!foundName) {
          let leadQuery = 'SELECT name, email, phone FROM leads WHERE 1=0';
          let leadParams = [];
          if (phone) {
            leadQuery = 'SELECT name, email, phone FROM leads WHERE phone LIKE ? LIMIT 1';
            leadParams = [`%${phone}`];
          } else if (email) {
            leadQuery = 'SELECT name, email, phone FROM leads WHERE email = ? LIMIT 1';
            leadParams = [email];
          }
          const [leads] = await pool.execute(leadQuery, leadParams);
          if (leads.length > 0) {
            foundName = leads[0].name;
            foundEmail = leads[0].email;
            if (leads[0].phone) {
              foundPhone = leads[0].phone.replace(/\D/g, '').slice(-10);
            }
          }
        }

        // 3. Check notifications and cleared_notifications tables
        if (!foundName) {
          const matchTerm = phone ? `%${phone}%` : `%${email}%`;
          const [notifs] = await pool.execute(
            'SELECT message, created_at FROM notifications WHERE message LIKE ? OR title LIKE ? ORDER BY created_at DESC LIMIT 10',
            [matchTerm, matchTerm]
          );
          const [clearedNotifs] = await pool.execute(
            'SELECT message, created_at FROM cleared_notifications WHERE message LIKE ? OR title LIKE ? ORDER BY created_at DESC LIMIT 10',
            [matchTerm, matchTerm]
          );
          const allNotifs = [...notifs, ...clearedNotifs].sort((a, b) => {
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
          });
          for (const row of allNotifs) {
            const parts = row.message.split('||');
            if (parts.length >= 5) {
              const parsedPhone = parts[4].replace(/\D/g, '').trim();
              const parsedEmail = parts[3].trim().toLowerCase();
              const isMatch = (phone && parsedPhone.includes(phone)) || (email && parsedEmail === email);
              if (isMatch) {
                foundName = parts[2];
                foundEmail = parts[3];
                if (parsedPhone) foundPhone = parsedPhone.slice(-10);
                break;
              }
            }
          }
        }

        if (foundName) {
          const virtualCust = {
            id: 'temp-customer',
            name: foundName,
            email: foundEmail && !foundEmail.includes('@luxesalon.local') ? foundEmail : '',
            phone: foundPhone || phone || '',
            is_temp: true,
            source: 'database_history'
          };
          return res.json({
            success: true,
            data: [virtualCust],
            pagination: { page: 1, limit: parseInt(limit), total: 1, pages: 1 }
          });
        }
      }
    }

    res.json({
      success: true,
      data: customers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: total[0].count, pages: Math.ceil(total[0].count / limit) },
    });
  } catch (error) { next(error); }
};

const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [customers] = await pool.execute(
      `SELECT c.*, mp.name AS membership_name, mp.discount, mp.benefits
       FROM customers c LEFT JOIN membership_plans mp ON c.membership_id = mp.id
       WHERE c.id = ?`, [id]
    );
    if (!customers.length) return res.status(404).json({ success: false, message: 'Customer not found.' });

    const phone = customers[0].phone ? customers[0].phone.replace(/\D/g, '').trim() : '';
    let apptConditions = 'a.customer_id = ?';
    const apptParams = [id];

    if (phone) {
      apptConditions = `a.customer_id = ? OR a.customer_id IN (
        SELECT id FROM customers WHERE REPLACE(phone, ' ', '') LIKE ?
      )`;
      apptParams.push(`%${phone.slice(-10)}`);
    }

    const [appointments] = await pool.execute(
      `SELECT a.*, s.name AS service_name, st.name AS staff_name
       FROM appointments a JOIN services s ON a.service_id = s.id JOIN staff st ON a.staff_id = st.id
       WHERE ${apptConditions} ORDER BY a.appointment_date DESC LIMIT 20`, apptParams
    );

    const customer = customers[0];

    let billConditions = 'b.customer_id = ?';
    const billParams = [id];

    if (phone) {
      billConditions = `b.customer_id = ? OR b.id IN (
        SELECT b2.id FROM bills b2
        LEFT JOIN customers c2 ON b2.customer_id = c2.id
        LEFT JOIN appointments a ON b2.appointment_id = a.id
        LEFT JOIN customers ac ON a.customer_id = ac.id
        WHERE (c2.phone IS NOT NULL AND REPLACE(c2.phone, ' ', '') LIKE ?)
           OR (ac.phone IS NOT NULL AND REPLACE(ac.phone, ' ', '') LIKE ?)
      )`;
      billParams.push(`%${phone.slice(-10)}`, `%${phone.slice(-10)}`);
    }

    const [bills] = await pool.execute(
      `SELECT b.* FROM bills b WHERE ${billConditions} ORDER BY b.created_at DESC LIMIT 10`, billParams
    );

    const [preferredServices] = await pool.execute(
      `SELECT s.name, COUNT(*) AS count FROM appointments a
       JOIN services s ON a.service_id = s.id
       WHERE a.customer_id = ? AND a.status = 'completed'
       GROUP BY s.id ORDER BY count DESC LIMIT 5`, [id]
    );

    const [billedServices] = await pool.execute(
      `SELECT bi.description AS name, SUM(bi.quantity) AS count
       FROM bill_items bi
       JOIN bills b ON bi.bill_id = b.id
       WHERE ${billConditions}
       GROUP BY bi.description
       ORDER BY count DESC`, billParams
    );

    // If customer has no gender set, pull it from the most recent bill that has gender
    const customerRecord = { ...customers[0] };
    if (!customerRecord.gender) {
      const lastBillWithGender = bills.find(b => b.customer_gender);
      if (lastBillWithGender) {
        customerRecord.gender = lastBillWithGender.customer_gender;
        // Auto-sync back to the customers table for future fetches
        await pool.execute('UPDATE customers SET gender = ? WHERE id = ?', [customerRecord.gender, id]);
      }
    }

    res.json({
      success: true,
      data: { ...customerRecord, appointments, bills, preferredServices, billedServices },
    });
  } catch (error) { next(error); }
};

const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, notes, gender } = req.body;

    if (name && /[0-9]/.test(name)) {
      return res.status(400).json({ success: false, message: 'Name must contain only letters and spaces.' });
    }
    const updates = []; const params = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (email) { updates.push('email = ?'); params.push(email); }
    if (phone) { updates.push('phone = ?'); params.push(phone); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if ('gender' in req.body) { updates.push('gender = ?'); params.push(req.body.gender || null); }
    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update.' });
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    await pool.execute(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`, params);
    const [updated] = await pool.execute('SELECT * FROM customers WHERE id = ?', [id]);
    res.json({ success: true, message: 'Customer updated.', data: updated[0] });
  } catch (error) { next(error); }
};

const getMyProfile = async (req, res, next) => {
  try {
    const [customers] = await pool.execute(
      `SELECT c.*, mp.name AS membership_name, mp.discount, mp.benefits, mp.validity_days
       FROM customers c LEFT JOIN membership_plans mp ON c.membership_id = mp.id
       WHERE c.user_id = ?`, [req.user.id]
    );
    if (!customers.length) return res.status(404).json({ success: false, message: 'Profile not found.' });
    
    const customer = customers[0];
    const email = customer.email ? customer.email.trim() : '';
    const phone = customer.phone ? customer.phone.replace(/\D/g, '').trim() : '';
    const customerId = customer.id;

    // Build conditions to find bills and appointments belonging to this customer
    let queryConditions = ['customer_id = ?'];
    const params = [customerId];

    if (phone) {
      // Find matching customer IDs with same phone (or same phone format)
      const [matchedCusts] = await pool.execute('SELECT id FROM customers WHERE phone LIKE ?', [`%${phone.slice(-10)}`]);
      matchedCusts.forEach(c => {
        if (!params.includes(c.id)) {
          queryConditions.push('customer_id = ?');
          params.push(c.id);
        }
      });
    }

    if (email && !email.includes('@luxesalon.local')) {
      const [matchedCusts] = await pool.execute('SELECT id FROM customers WHERE LOWER(email) = LOWER(?)', [email]);
      matchedCusts.forEach(c => {
        if (!params.includes(c.id)) {
          queryConditions.push('customer_id = ?');
          params.push(c.id);
        }
      });
    }

    const whereClause = `(${queryConditions.join(' OR ')})`;

    // Get all bills
    const [bills] = await pool.execute(
      `SELECT total_amount, created_at, appointment_id FROM bills WHERE ${whereClause}`,
      params
    );

    // Get all completed/active appointments
    const [appointments] = await pool.execute(
      `SELECT a.appointment_date, a.appointment_time, a.service_id, s.name AS service_name, a.id, a.bill_id
       FROM appointments a
       LEFT JOIN services s ON a.service_id = s.id
       WHERE a.customer_id IN (${params.map(() => '?').join(', ')}) AND a.status NOT IN ('cancelled', 'no_show')`,
      params
    );

    // Calculate total spent
    const totalSpent = bills.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);

    // To count total visits:
    // Create unique keys for each visit.
    // A visit can be represented by a date (YYYY-MM-DD). If an appointment is on a date, and a bill is on that same date,
    // they represent a pair and should count as 1 visit.
    // Wait, let's look at the user prompt: "if one appoinment is matching with some bill exavtly service,date then it should take that appoinment and bill as pair and never visits should increase 1 time like this fetch total visits and total spent"
    // So if a bill's date (YYYY-MM-DD) matches an appointment's date, or a bill is linked to the appointment, it is 1 visit.
    // Let's implement unique visit grouping by Date (YYYY-MM-DD). If a customer has multiple services on the same day, they might be separate or the same visit, but grouping by Date is extremely robust and matches the request. Let's make sure it handles both appointments and bills.
    
    const visitDates = new Set();
    
    // Add all appointment dates
    appointments.forEach(appt => {
      if (appt.appointment_date) {
        // Format appointment_date to YYYY-MM-DD
        const d = new Date(appt.appointment_date);
        if (!isNaN(d.getTime())) {
          const dateStr = d.toISOString().substring(0, 10);
          visitDates.add(dateStr);
        }
      }
    });

    // Add all bill dates
    bills.forEach(bill => {
      if (bill.created_at) {
        const d = new Date(bill.created_at);
        if (!isNaN(d.getTime())) {
          const dateStr = d.toISOString().substring(0, 10);
          visitDates.add(dateStr);
        }
      }
    });

    const totalVisits = visitDates.size;

    res.json({
      success: true,
      data: {
        ...customer,
        total_visits: totalVisits,
        total_spent: totalSpent
      }
    });
  } catch (error) { next(error); }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;

    if (name && /[0-9]/.test(name)) {
      return res.status(400).json({ success: false, message: 'Name must contain only letters and spaces.' });
    }
    await pool.execute('UPDATE customers SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [name, phone, req.user.id]);
    await pool.execute('UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, phone, req.user.id]);
    res.json({ success: true, message: 'Profile updated.' });
  } catch (error) { next(error); }
};

const getCustomerStats = async (req, res, next) => {
  try {
    // Get total clients count
    const [[totalRow]] = await pool.execute(`SELECT COUNT(*) AS count FROM customers`);
    const totalClients = Number(totalRow?.count || 0);

    // Get new clients count
    const [[newRow]] = await pool.execute(`SELECT COUNT(*) AS count FROM customers c WHERE (SELECT COUNT(*) FROM bills WHERE customer_id = c.id AND status = 'paid') = 1`);
    const newClients = Number(newRow?.count || 0);

    // Get old clients count
    const [[repeatRow]] = await pool.execute(`SELECT COUNT(*) AS count FROM customers c WHERE (SELECT COUNT(*) FROM bills WHERE customer_id = c.id AND status = 'paid') > 1`);
    const repeatClients = Number(repeatRow?.count || 0);

    // Get lost clients count
    const ninetyDaysAgo = db.useSqlite
      ? "datetime('now', '-90 days')"
      : db.usePostgres
      ? "NOW() - INTERVAL '90 DAY'"
      : "DATE_SUB(NOW(), INTERVAL 90 DAY)";
    const [[lostRow]] = await pool.execute(`
      SELECT COUNT(*) AS count FROM customers WHERE total_visits > 0 AND (last_visit < ${ninetyDaysAgo} OR (last_visit IS NULL AND created_at < ${ninetyDaysAgo}))
    `);
    const lostClients = Number(lostRow?.count || 0);

    // Get unique membership holders count
    const [[membersRow]] = await pool.execute(`SELECT COUNT(*) AS count FROM customers WHERE membership_id IS NOT NULL`);
    const membershipHolders = Number(membersRow?.count || 0);

    // Calculate percentage of membership holders relative to total unique clients
    const membershipPercentage = totalClients > 0 ? parseFloat(((membershipHolders / totalClients) * 100).toFixed(1)) : 0;

    // Get total bills generated count (excluding walk-ins)
    const [[billsRow]] = await pool.execute(`SELECT COUNT(*) AS count FROM bills WHERE status = 'paid' AND customer_id IS NOT NULL`);
    const totalBills = Number(billsRow?.count || 0);

    res.json({
      success: true,
      data: {
        total: totalClients,
        new_clients: newClients,
        old_clients: repeatClients,
        lost: lostClients,
        members: membershipHolders,
        membership_percentage: membershipPercentage,
        total_bills: totalBills
      }
    });
  } catch (error) { next(error); }
};

const getCustomerChartData = async (req, res, next) => {
  try {
    // New clients per month: bills in that month where customer_id is NULL
    // OR customer has exactly 1 paid bill ever (first-timers that month)
    const newQuery = `
      SELECT 
        SUBSTR(CAST(b.created_at AS VARCHAR), 1, 7) AS visit_month,
        COUNT(DISTINCT b.customer_id) AS new_count
      FROM bills b
      JOIN customers c ON b.customer_id = c.id
      WHERE b.status = 'paid'
        AND (SELECT COUNT(*) FROM bills WHERE customer_id = c.id AND status = 'paid') = 1
      GROUP BY SUBSTR(CAST(b.created_at AS VARCHAR), 1, 7)
    `;

    // Old clients per month: unique customers who have >= 2 paid bills ever
    // and had at least one bill in that month
    const oldQuery = `
      SELECT 
        SUBSTR(CAST(b.created_at AS VARCHAR), 1, 7) AS visit_month,
        COUNT(DISTINCT b.customer_id) AS old_count
      FROM bills b
      JOIN customers c ON b.customer_id = c.id
      WHERE b.status = 'paid'
        AND (SELECT COUNT(*) FROM bills WHERE customer_id = c.id AND status = 'paid') > 1
      GROUP BY SUBSTR(CAST(b.created_at AS VARCHAR), 1, 7)
    `;

    const [newRows] = await pool.execute(newQuery);
    const [oldRows] = await pool.execute(oldQuery);

    // Generate last 6 calendar months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      chartData.push({
        key: yearMonth,
        name: monthNames[d.getMonth()],
        new: 0,
        old: 0
      });
    }

    // Map new client results
    newRows.forEach(row => {
      const item = chartData.find(c => c.key === row.visit_month);
      if (item) item.new = parseInt(row.new_count || 0);
    });

    // Map old client results
    oldRows.forEach(row => {
      const item = chartData.find(c => c.key === row.visit_month);
      if (item) item.old = parseInt(row.old_count || 0);
    });

    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    next(error);
  }
};

const getBookingSourcesChartData = async (req, res, next) => {
  try {
    const [[websiteRow]] = await pool.execute(
      "SELECT COUNT(*) AS count FROM appointments WHERE source = 'online'"
    );
    const websiteCount = parseInt(websiteRow?.count || 0);

    const [[phoneRow]] = await pool.execute(
      "SELECT COUNT(*) AS count FROM appointments WHERE source = 'phone'"
    );
    const phoneCount = parseInt(phoneRow?.count || 0);

    const [[walkinRow]] = await pool.execute(
      "SELECT COUNT(*) AS count FROM bills WHERE appointment_id IS NULL"
    );
    const walkinCount = parseInt(walkinRow?.count || 0);

    res.json({
      success: true,
      data: [
        { source: 'Walk-ins', value: walkinCount, color: '#C9A84C' },
        { source: 'Phone Calls', value: phoneCount, color: '#3B82F6' },
        { source: 'Website', value: websiteCount, color: '#8B5CF6' }
      ]
    });
  } catch (error) {
    next(error);
  }
};

const getMembershipGrowthChart = async (req, res, next) => {
  try {
    let growthQ;
    if (db.usePostgres) {
      growthQ = `SELECT TO_CHAR(purchased_at, 'YYYY-MM') AS month, COUNT(*) AS purchases
        FROM membership_purchases
        WHERE purchased_at >= NOW() - INTERVAL '6 MONTH'
        GROUP BY month ORDER BY month ASC`;
    } else if (db.useSqlite) {
      growthQ = `SELECT strftime('%Y-%m', purchased_at) AS month, COUNT(*) AS purchases
        FROM membership_purchases
        WHERE purchased_at >= datetime('now', '-6 months')
        GROUP BY month ORDER BY month ASC`;
    } else {
      growthQ = `SELECT DATE_FORMAT(purchased_at, '%Y-%m') AS month, COUNT(*) AS purchases
        FROM membership_purchases
        WHERE purchased_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY month ORDER BY month ASC`;
    }

    const [growthRows] = await pool.execute(growthQ);
    const [[activeRow]] = await pool.execute(
      "SELECT COUNT(*) AS count FROM customers WHERE membership_id IS NOT NULL"
    );

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const growthMap = {};
    growthRows.forEach(r => { growthMap[r.month] = parseInt(r.purchases || 0); });

    const activeTotal = parseInt(activeRow?.count || 0);
    let runningTotal = Math.max(0, activeTotal - growthRows.reduce((s, r) => s + parseInt(r.purchases||0), 0));
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      runningTotal += (growthMap[key] || 0);
      chartData.push({ month: monthNames[d.getMonth()], members: runningTotal });
    }

    res.json({ success: true, data: chartData });
  } catch (error) {
    next(error);
  }
};
const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [custRows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [id]);
    if (custRows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found' });
    
    const customer = custRows[0];
    // Delete associated appointments and bills first to prevent foreign key constraint errors
    await pool.execute('DELETE FROM appointments WHERE customer_id = ?', [id]);
    const [bills] = await pool.execute('SELECT id FROM bills WHERE customer_id = ?', [id]);
    if (bills.length > 0) {
      const billIds = bills.map(b => `'${b.id}'`).join(',');
      await pool.execute(`DELETE FROM bill_items WHERE bill_id IN (${billIds})`);
      await pool.execute('DELETE FROM bills WHERE customer_id = ?', [id]);
    }
    
    await pool.execute('DELETE FROM customers WHERE id = ?', [id]);
    if (customer.user_id) {
      await pool.execute('DELETE FROM users WHERE id = ?', [customer.user_id]);
    }
    
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { 
  getAllCustomers, 
  getCustomerById, 
  updateCustomer, 
  deleteCustomer,
  getMyProfile, 
  updateMyProfile, 
  getCustomerStats, 
  getCustomerChartData,
  getBookingSourcesChartData,
  getMembershipGrowthChart
};
