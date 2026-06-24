const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.all("SELECT * FROM bills WHERE status = 'paid'", (err, rows) => {
    if (err) console.error(err);
    console.log("PAID BILLS count:", rows.length);
    console.log("PAID BILLS total_amount sum:", rows.reduce((sum, r) => sum + r.total_amount, 0));
    rows.forEach(r => {
      console.log(`Bill ID: ${r.id}, Customer: ${r.customer_id}, Date: ${r.created_at}, Amount: ${r.total_amount}`);
    });
  });

  db.all("SELECT * FROM bill_items", (err, rows) => {
    if (err) console.error(err);
    console.log("BILL ITEMS count:", rows.length);
  });

  db.all("SELECT * FROM customers", (err, rows) => {
    if (err) console.error(err);
    console.log("CUSTOMERS count:", rows.length);
    rows.forEach(r => {
      console.log(`Cust ID: ${r.id}, Name: ${r.name}, Phone: ${r.phone}, Email: ${r.email}, Created: ${r.created_at}`);
    });
  });
});
