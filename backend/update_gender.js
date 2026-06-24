const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.all("SELECT id, customer_id, notes FROM appointments", (err, rows) => {
    if (err) console.error(err);
    console.log("Appointments:", rows);
  });
});

db.close();
