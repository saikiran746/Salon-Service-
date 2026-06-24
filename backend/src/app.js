const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// Custom API request logger
app.use((req, res, next) => {
  console.log(`[API REQUEST] ${req.method} ${req.originalUrl}`);
  const originalJson = res.json;
  res.json = function(body) {
    console.log(`[API RESPONSE] ${req.method} ${req.originalUrl} Status: ${res.statusCode}`);
    if (body && body.success === false) {
      console.log(`[API ERROR BODY]`, body);
    }
    return originalJson.call(this, body);
  };
  next();
});

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api', limiter);

// Stricter limit for auth routes (login, register, etc.)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many auth attempts. Please try again later.' },
  skip: (req) => req.path === '/me' || req.url.includes('/me'),
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Dynamic generation fallback for public static invoices
app.get('/invoices/:filename', async (req, res, next) => {
  const filename = req.params.filename;
  if (!filename.endsWith('.pdf')) {
    return next();
  }
  
  const fs = require('fs');
  const billId = filename.replace('.pdf', '');
  const invoicesDir = path.join(__dirname, '../uploads/invoices');
  const pdfPath = path.join(invoicesDir, filename);

  if (fs.existsSync(pdfPath)) {
    return res.sendFile(pdfPath);
  }

  try {
    const { pool } = require('./config/database');
    const [bills] = await pool.execute('SELECT * FROM bills WHERE id = ?', [billId]);
    if (bills.length === 0) {
      return next();
    }

    const bill = bills[0];
    const [items] = await pool.execute('SELECT * FROM bill_items WHERE bill_id = ?', [billId]);
    const [customer] = await pool.execute('SELECT * FROM customers WHERE id = ?', [bill.customer_id]);
    
    let salonSettings = {};
    const [settingsRows] = await pool.execute('SELECT * FROM site_settings LIMIT 1');
    if (settingsRows.length > 0) {
      const s = settingsRows[0];
      salonSettings = {
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

    const { generateInvoicePDF } = require('./utils/invoice');
    const dateFormatted = new Date(bill.created_at).toLocaleString('en-IN', { 
      dateStyle: 'short', 
      timeStyle: 'short' 
    });

    const billData = {
      invoiceNumber: bill.invoice_number,
      billId: bill.id,
      items: items.map(item => {
        const priceVal = parseFloat(item.unit_price || item.price || 0);
        const qtyVal = parseInt(item.quantity || 1);
        const discountPct = parseFloat(item.discount_percentage || 0);
        const finalAmt = priceVal * qtyVal - (priceVal * qtyVal * discountPct / 100);
        return {
          ...item,
          description: item.description,
          quantity: qtyVal,
          unit_price: priceVal,
          price: priceVal,
          discount_percentage: discountPct,
          final_amount: finalAmt,
          total_price: priceVal * qtyVal
        };
      }),
      subtotal: bill.subtotal,
      discount: bill.discount_percent,
      discountAmount: bill.discount_amount,
      taxAmount: bill.tax_amount,
      totalAmount: bill.total_amount,
      payment_method: bill.payment_method,
      customer: customer[0] || {
        name: bill.customer_name || 'Walk-In Customer',
        phone: bill.customer_phone || '',
        email: bill.customer_email || ''
      },
      date: dateFormatted
    };

    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const generatedPath = await generateInvoicePDF(billData, bill.id, salonSettings);
    await pool.execute('UPDATE bills SET pdf_path = ? WHERE id = ?', [generatedPath, bill.id]);

    res.contentType('application/pdf').sendFile(generatedPath);
  } catch (err) {
    console.error('[Invoice Auto-Generation Error]', err);
    next();
  }
});

// Static files for invoices and media uploads
app.use('/invoices', express.static(path.join(__dirname, '../uploads/invoices')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// API Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/services', require('./routes/services'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/memberships', require('./routes/memberships'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/email-marketing', require('./routes/emailMarketing'));
app.use('/api/schedule', require('./routes/staff_schedule'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/whatsapp', require('./routes/whatsapp'));


// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error:', err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'Duplicate entry. Resource already exists.' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired.' });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;
