const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT * FROM staff", (err, rows) => {
  if (err) console.error(err);
  else {
    console.log('--- SQLITE STAFF ---');
    console.log(rows.map(r => ({ id: r.id, name: r.name, is_active: r.is_active })));
  }
  db.close();
});
