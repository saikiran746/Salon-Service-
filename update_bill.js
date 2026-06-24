const { pool, testConnection } = require('./backend/src/config/database');
testConnection().then(() => {
  pool.execute("UPDATE bills SET payment_method = 'cash:100.00, upi:57.50' WHERE invoice_number = 'INV-202606-9679'")
    .then(() => {
      console.log('Updated successfully');
      process.exit(0);
    })
    .catch(console.error);
}).catch(console.error);
