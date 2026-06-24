const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT * FROM bills", (err, rows) => {
  if (err) console.error(err);
  else {
    console.log(`Found ${rows.length} bills in SQLite.`);
    console.log(JSON.stringify(rows.slice(0, 10), null, 2)); // show first 10
  }
  process.exit(0);
});
