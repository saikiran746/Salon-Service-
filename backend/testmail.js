const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

transporter.sendMail({
  from: process.env.EMAIL_FROM_ADDRESS,
  to: 'lakadaramkalyan7@gmail.com',
  subject: 'Test Invoice - Luxe Salon System',
  html: '<h2>Invoice Email Test</h2><p>Invoice emails are now working! PDF will be attached in real bills.</p>'
}, (err, info) => {
  if (err) { console.log('SEND ERROR:', err.message); }
  else { console.log('EMAIL SENT SUCCESSFULLY! Message ID:', info.messageId); }
  process.exit();
});
