const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { generateInvoicePDF } = require('../utils/invoice');
const { sendEmail } = require('../services/emailService');

// Helper: fetch salon settings for invoice PDF generation
const getSalonSettings = async () => {
  try {
    const [rows] = await pool.execute('SELECT * FROM site_settings LIMIT 1');
    if (rows.length > 0) {
      const s = rows[0];
      return {
        site_name: s.site_name || undefined,
        address: s.address || undefined,
        phone: s.phone || undefined,
        email: s.email || undefined,
        gstin: s.gstin || undefined,
        bank_name: s.bank_name || undefined,
        ifsc_code: s.ifsc_code || undefined,
        account_number: s.account_number || undefined,
      };
    }
  } catch (err) {
    console.warn('Could not fetch salon settings for invoice:', err.message);
  }
  return {};
};

const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${year}${month}-${random}`;
};

const createBill = async (req, res, next) => {
  try {
    const {
      appointment_id,
      customer_id,
      items,
      discount = 0,
      discount_percent,
      discount_amount,
      tax_percent,
      tax_amount,
      total_amount,
      payment_method = 'cash'
    } = req.body;

    // Resolve customer phone for linking walk-in bills
    const reqCustomerName = req.body.customer_name || null;
    const reqCustomerEmail = req.body.customer_email || null;
    let customer_gender = req.body.customer_gender ? req.body.customer_gender.toLowerCase() : null;

    if (!customer_gender && customer_id) {
      const [custRows] = await pool.execute('SELECT gender FROM customers WHERE id = ?', [customer_id]);
      if (custRows.length > 0 && custRows[0].gender) {
        customer_gender = custRows[0].gender.toLowerCase();
        console.log(`[Billing] Fetched missing gender '${customer_gender}' from customer record for ID: ${customer_id}`);
      }
    }

    const billId = uuidv4();
    const invoiceNumber = generateInvoiceNumber();
    console.log(`[Billing] Generating bill ${invoiceNumber} for customer ${customer_id || 'Walk-in'} (Gender: ${customer_gender || 'None'})`);

    let calcSubtotal = items.reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 1)), 0);
    let finalSubtotal = req.body.subtotal !== undefined ? parseFloat(req.body.subtotal) : calcSubtotal;

    let calcServiceDiscount = items.reduce((sum, item) => {
      const orig = parseFloat(item.price || 0) * parseInt(item.quantity || 1);
      const pct = parseFloat(item.discount_percentage || 0);
      return sum + (orig * pct / 100);
    }, 0);

    let calcNetAmount = Math.max(0, finalSubtotal - calcServiceDiscount);

    let finalDiscountPercent = discount_percent !== undefined ? parseFloat(discount_percent) : parseFloat(discount);
    let finalDiscountAmount = discount_amount !== undefined ? parseFloat(discount_amount) : (calcNetAmount * finalDiscountPercent) / 100;

    let finalTaxPercent = tax_percent !== undefined ? parseFloat(tax_percent) : 18.00;
    let finalTaxAmount = tax_amount !== undefined ? parseFloat(tax_amount) : (calcNetAmount - finalDiscountAmount) * (finalTaxPercent / 100);

    let finalTotalAmount = total_amount !== undefined ? parseFloat(total_amount) : (calcNetAmount - finalDiscountAmount + finalTaxAmount);

    // Get customer phone for walk-in bills (from customer record or mobile search)
    let billCustomerPhone = req.body.customer_phone || null;
    if (!billCustomerPhone && customer_id) {
      const [custPhoneRows] = await pool.execute('SELECT phone FROM customers WHERE id = ?', [customer_id]);
      if (custPhoneRows.length > 0) billCustomerPhone = custPhoneRows[0].phone;
    }

    const currentIsoTime = new Date().toISOString();

    await pool.execute(
      `INSERT INTO bills (id, invoice_number, appointment_id, customer_id, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total_amount, payment_method, status, customer_gender, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?)`,
      [
        billId,
        invoiceNumber,
        appointment_id || null,
        customer_id || null,
        finalSubtotal,
        finalDiscountPercent,
        finalDiscountAmount,
        finalTaxPercent,
        finalTaxAmount,
        finalTotalAmount,
        payment_method,
        customer_gender || null,
        currentIsoTime
      ]
    );

    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const walkinDate = nowIST.getFullYear() + '-' + String(nowIST.getMonth() + 1).padStart(2, '0') + '-' + String(nowIST.getDate()).padStart(2, '0');
    const walkinTime = String(nowIST.getHours()).padStart(2, '0') + ':' + String(nowIST.getMinutes()).padStart(2, '0');

    // Insert bill items
    for (const item of items) {
      const itemQty = parseInt(item.quantity || 1);
      const itemPrice = parseFloat(item.price || 0);
      const itemDiscountPct = parseFloat(item.discount_percentage || 0);
      const itemTotalPrice = itemPrice * itemQty;
      const itemFinalAmount = itemTotalPrice - (itemTotalPrice * itemDiscountPct / 100);

      const finalDescription = item.stylist ? `${item.description} (${item.stylist})` : item.description;

      await pool.execute(
        'INSERT INTO bill_items (id, bill_id, description, quantity, unit_price, total_price, discount_percentage, final_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), billId, finalDescription, itemQty, itemPrice, itemTotalPrice, itemDiscountPct, itemFinalAmount]
      );
    }

    // Update appointment if provided
    if (appointment_id) {
      await pool.execute("UPDATE appointments SET status = 'completed', bill_id = ? WHERE id = ?", [billId, appointment_id]);
    }
    // Walk-ins no longer create fake appointments here.

    // Auto-complete other active appointments matching this customer's details (by ID or phone)
    try {
      let matchCustomerId = customer_id || null;
      let matchPhone = billCustomerPhone ? billCustomerPhone.replace(/\D/g, '').trim() : '';
      let matchName = reqCustomerName ? reqCustomerName.trim() : '';
      let matchEmail = reqCustomerEmail ? reqCustomerEmail.trim() : '';

      // Calculate current date in local timezone to avoid UTC midnight drift
      const localToday = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).substring(0, 10);

      let query = `
        SELECT a.id FROM appointments a
        LEFT JOIN customers c ON a.customer_id = c.id
        WHERE a.status IN ('pending', 'confirmed')
        AND DATE(a.appointment_date) <= ?
      `;
      const params = [localToday];

      let conditions = [];
      if (matchCustomerId) conditions.push(`a.customer_id = ?`);
      if (matchPhone) conditions.push(`c.phone LIKE ?`);
      if (matchName && matchName.toLowerCase() !== 'walk-in customer') conditions.push(`LOWER(c.name) = LOWER(?)`);
      if (matchEmail) conditions.push(`LOWER(c.email) = LOWER(?)`);

      if (conditions.length > 0) {
        query += ` AND (${conditions.join(' OR ')})`;
        
        if (matchCustomerId) params.push(matchCustomerId);
        if (matchPhone) params.push(`%${matchPhone.slice(-10)}`);
        if (matchName && matchName.toLowerCase() !== 'walk-in customer') params.push(matchName);
        if (matchEmail) params.push(matchEmail);

        const [activeAppts] = await pool.execute(query, params);
        for (const appt of activeAppts) {
          if (appt.id !== appointment_id) {
            await pool.execute("UPDATE appointments SET status = 'completed', bill_id = ? WHERE id = ?", [billId, appt.id]);
          }
        }
      }
    } catch (err) {
      console.error('Error auto-completing matching appointments:', err.message);
    }

    // Update customer details and stats
    if (customer_id) {
      let setClause = 'total_spent = total_spent + ?, total_visits = total_visits + 1, last_visit = NOW()';
      let queryParams = [finalTotalAmount];
      if (reqCustomerName) { setClause += ', name = ?'; queryParams.push(reqCustomerName); }
      if (reqCustomerEmail) { setClause += ', email = ?'; queryParams.push(reqCustomerEmail); }
      if (customer_gender) { setClause += ', gender = ?'; queryParams.push(customer_gender.toLowerCase()); }
      queryParams.push(customer_id);
      
      await pool.execute(`UPDATE customers SET ${setClause} WHERE id = ?`, queryParams);
    }

    // Generate PDF - include customer_name/phone even for walk-ins
    const [customerRows] = customer_id ? await pool.execute('SELECT * FROM customers WHERE id = ?', [customer_id]) : [[]];
    const customerForPdf = customerRows[0] || {
      name: reqCustomerName || 'Walk-In Customer',
      phone: billCustomerPhone || '',
      email: reqCustomerEmail || ''
    };

    const itemsForPdf = items.map(item => {
      const priceVal = parseFloat(item.price || item.unit_price || 0);
      const qtyVal = parseInt(item.quantity || 1);
      const discountPct = parseFloat(item.discount_percentage || 0);
      const finalAmt = priceVal * qtyVal - (priceVal * qtyVal * discountPct / 100);
      return {
        ...item,
        description: item.stylist ? `${item.description} (${item.stylist})` : item.description,
        quantity: qtyVal,
        unit_price: priceVal,
        price: priceVal,
        discount_percentage: discountPct,
        final_amount: finalAmt,
        total_price: priceVal * qtyVal
      };
    });

    const billData = {
      invoiceNumber,
      billId,
      items: itemsForPdf,
      subtotal: finalSubtotal,
      discount: finalDiscountPercent,
      discountAmount: finalDiscountAmount,
      taxAmount: finalTaxAmount,
      totalAmount: finalTotalAmount,
      payment_method,
      customer: customerForPdf,
      date: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
    };

    const salonSettings = await getSalonSettings();
    const pdfPath = await generateInvoicePDF(billData, billId, salonSettings);

    await pool.execute('UPDATE bills SET pdf_path = ? WHERE id = ?', [pdfPath, billId]);

    // Send invoice email asynchronously
    if (customerForPdf.email && !customerForPdf.email.includes('@luxesalon.local')) {
      sendEmail({
        to: customerForPdf.email,
        subject: `Invoice ${invoiceNumber} - Luxe Salon`,
        template: 'invoice',
        data: { name: customerForPdf.name, invoiceNumber, totalAmount: finalTotalAmount },
        attachments: [{ filename: `${invoiceNumber}.pdf`, path: pdfPath }],
      }).catch(err => console.error('Email send failed:', err));
    }

    const [bill] = await pool.execute(
      `SELECT b.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
       FROM bills b LEFT JOIN customers c ON b.customer_id = c.id WHERE b.id = ?`, [billId]
    );

    // Merge customer_name/phone from request if not available from join (walk-in)
    const billResult = bill[0] || {};
    if (!billResult.customer_name && reqCustomerName) billResult.customer_name = reqCustomerName;
    if (!billResult.customer_phone && billCustomerPhone) billResult.customer_phone = billCustomerPhone;

    res.status(201).json({ success: true, message: 'Bill created.', data: { ...billResult, pdfUrl: `/api/billing/${billId}/pdf` } });
  } catch (error) { next(error); }
};

const getAllBills = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, customer_id, payment_method, status, from_date, to_date, new_only, returning, membership, exclude_walkins } = req.query;
    const offset = (page - 1) * limit;
    let where = '1=1'; const params = [];

    if (customer_id) { where += ' AND b.customer_id = ?'; params.push(customer_id); }
    if (payment_method) { where += ' AND b.payment_method = ?'; params.push(payment_method); }
    if (status) { where += ' AND b.status = ?'; params.push(status); }
    if (from_date) { 
      const utcFrom = new Date(`${from_date}T00:00:00+05:30`).toISOString().slice(0, 19).replace('T', ' ');
      where += ' AND b.created_at >= ?'; params.push(utcFrom); 
    }
    if (to_date) { 
      const utcTo = new Date(`${to_date}T23:59:59+05:30`).toISOString().slice(0, 19).replace('T', ' ');
      where += ' AND b.created_at <= ?'; params.push(utcTo); 
    }

    if (exclude_walkins === 'true') {
      where += ' AND b.customer_id IS NOT NULL';
    }
    if (new_only === 'true') {
      where += ` AND b.customer_id IS NOT NULL AND b.customer_id IN (
        SELECT customer_id FROM bills WHERE status = 'paid' AND customer_id IS NOT NULL GROUP BY customer_id HAVING COUNT(id) = 1
      )`;
    }
    if (returning === 'true') {
      where += ` AND b.customer_id IS NOT NULL AND b.customer_id IN (
        SELECT customer_id FROM bills WHERE status = 'paid' GROUP BY customer_id HAVING COUNT(id) >= 2
      )`;
    }
    if (membership === 'yes') {
      where += ` AND b.customer_id IN (
        SELECT id FROM customers WHERE membership_id IS NOT NULL
      )`;
    }

    const [bills] = await pool.execute(
      `SELECT b.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
              COALESCE((SELECT COUNT(*) FROM bills b2 WHERE b2.customer_id = b.customer_id AND b2.status = 'paid'), 0) AS total_visit_count
       FROM bills b LEFT JOIN customers c ON b.customer_id = c.id
       WHERE ${where} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [total] = await pool.execute(`SELECT COUNT(*) AS count, SUM(total_amount) AS total_revenue FROM bills b WHERE ${where}`, params);
    
    // Calculate payment method breakdown across all matching records
    const [pmStats] = await pool.execute(`
      SELECT payment_method, COUNT(*) AS count, SUM(total_amount) AS amount 
      FROM bills b 
      WHERE ${where} 
      GROUP BY payment_method
    `, params);

    res.json({ 
      success: true, 
      data: bills, 
      summary: { 
        total: total[0].count, 
        totalRevenue: total[0].total_revenue,
        paymentMethods: pmStats 
      }, 
      pagination: { page: parseInt(page), limit: parseInt(limit), total: total[0].count } 
    });
  } catch (error) { next(error); }
};

const getBillById = async (req, res, next) => {
  try {
    const [bills] = await pool.execute(
      `SELECT b.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
       FROM bills b LEFT JOIN customers c ON b.customer_id = c.id WHERE b.id = ?`, [req.params.id]
    );
    if (!bills.length) return res.status(404).json({ success: false, message: 'Bill not found.' });

    const [items] = await pool.execute('SELECT * FROM bill_items WHERE bill_id = ?', [req.params.id]);
    res.json({ success: true, data: { ...bills[0], items } });
  } catch (error) { next(error); }
};

const downloadInvoice = async (req, res, next) => {
  try {
    const [bills] = await pool.execute('SELECT * FROM bills WHERE id = ?', [req.params.id]);
    if (!bills.length) return res.status(404).json({ success: false, message: 'Bill not found.' });

    const bill = bills[0];
    if (!bill.pdf_path || !fs.existsSync(bill.pdf_path)) {
      // Re-generate PDF
      const [items] = await pool.execute('SELECT * FROM bill_items WHERE bill_id = ?', [req.params.id]);
      const [customer] = await pool.execute('SELECT * FROM customers WHERE id = ?', [bill.customer_id]);
      const salonSettings = await getSalonSettings();
      const pdfPath = await generateInvoicePDF({ ...bill, items, customer: customer[0] || {}, date: new Date(bill.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) }, bill.id, salonSettings);
      await pool.execute('UPDATE bills SET pdf_path = ? WHERE id = ?', [pdfPath, bill.id]);
      return res.download(pdfPath, `${bill.invoice_number}.pdf`);
    }
    res.download(bill.pdf_path, `${bill.invoice_number}.pdf`);
  } catch (error) { next(error); }
};

const viewInvoice = async (req, res, next) => {
  try {
    const [bills] = await pool.execute('SELECT * FROM bills WHERE id = ?', [req.params.id]);
    if (!bills.length) return res.status(404).json({ success: false, message: 'Bill not found.' });

    const bill = bills[0];
    if (!bill.pdf_path || !fs.existsSync(bill.pdf_path)) {
      // Re-generate PDF
      const [items] = await pool.execute('SELECT * FROM bill_items WHERE bill_id = ?', [req.params.id]);
      const [customer] = await pool.execute('SELECT * FROM customers WHERE id = ?', [bill.customer_id]);
      const salonSettings = await getSalonSettings();
      const pdfPath = await generateInvoicePDF({ ...bill, items, customer: customer[0] || {}, date: new Date(bill.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) }, bill.id, salonSettings);
      await pool.execute('UPDATE bills SET pdf_path = ? WHERE id = ?', [pdfPath, bill.id]);
      return res.contentType('application/pdf').sendFile(pdfPath);
    }
    res.contentType('application/pdf').sendFile(bill.pdf_path);
  } catch (error) { next(error); }
};

const getMyBills = async (req, res, next) => {
  try {
    const [customerRows] = await pool.execute(
      `SELECT c.id, c.phone FROM customers c WHERE c.user_id = ?`, [req.user.id]
    );
    if (!customerRows.length) return res.json({ success: true, data: [] });

    const customer = customerRows[0];
    const customerId = customer.id;
    const customerPhone = customer.phone ? customer.phone.replace(/\D/g, '').trim() : '';

    let bills = [];
    if (customerPhone) {
      // Fetch bills linked to this customer_id OR matching phone from appointments
      const [billRows] = await pool.execute(
        `SELECT DISTINCT b.* FROM bills b
         LEFT JOIN customers c ON b.customer_id = c.id
         LEFT JOIN appointments a ON b.appointment_id = a.id
         LEFT JOIN customers ac ON a.customer_id = ac.id
         WHERE b.customer_id = ?
            OR (c.phone IS NOT NULL AND REPLACE(c.phone, ' ', '') LIKE ?)
            OR (ac.phone IS NOT NULL AND REPLACE(ac.phone, ' ', '') LIKE ?)
         ORDER BY b.created_at DESC`,
        [customerId, `%${customerPhone.slice(-10)}`, `%${customerPhone.slice(-10)}`]
      );
      bills = billRows;
    } else {
      const [billRows] = await pool.execute(
        'SELECT * FROM bills WHERE customer_id = ? ORDER BY created_at DESC', [customerId]
      );
      bills = billRows;
    }

    res.json({ success: true, data: bills });
  } catch (error) { next(error); }
};

const deleteBill = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [bills] = await pool.execute('SELECT * FROM bills WHERE id = ?', [id]);
    if (!bills.length) return res.status(404).json({ success: false, message: 'Bill not found' });
    
    const bill = bills[0];

    // Delete bill items and bill
    await pool.execute('DELETE FROM bill_items WHERE bill_id = ?', [id]);
    await pool.execute('DELETE FROM bills WHERE id = ?', [id]);

    // Revert appointment status if linked
    if (bill.appointment_id) {
      await pool.execute('UPDATE appointments SET status = ? WHERE id = ?', ['confirmed', bill.appointment_id]);
    }

    res.json({ success: true, message: 'Bill deleted successfully' });
  } catch (error) { next(error); }
};

module.exports = { createBill, getAllBills, getBillById, downloadInvoice, viewInvoice, getMyBills, deleteBill };
