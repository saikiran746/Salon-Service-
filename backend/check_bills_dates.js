const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT id, customer_id, created_at, subtotal, discount_amount, tax_amount, total_amount FROM bills WHERE status = 'paid' ORDER BY created_at ASC", [], (err, rows) => {
  if (err) return console.error(err);
  console.log('Total bills found:', rows.length);
  console.log('Unique customer IDs in bills:', [...new Set(rows.map(r => r.customer_id))]);
  console.log('Sample of bills sorted by date:');
  rows.forEach((r, i) => {
    if (i < 10 || i > rows.length - 10) {
      console.log(`Index ${i}: ID=${r.id}, Customer=${r.customer_id}, Date=${r.created_at}, Subtotal=${r.subtotal}, Discount=${r.discount_amount}, Tax=${r.tax_amount}, Total=${r.total_amount}`);
    }
  });
  db.close();
});
