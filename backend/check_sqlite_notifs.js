const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT * FROM notifications", (err, rows) => {
  if (err) console.error(err);
  else {
    console.log(`Found ${rows.length} notifications in SQLite:`);
    console.log(JSON.stringify(rows, null, 2));
  }
  process.exit(0);
});
