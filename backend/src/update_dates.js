const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`UPDATE bills SET created_at = datetime(created_at, '+5 hours', '+30 minutes')`, function(err) {
    if (err) console.error(err);
    else console.log(`Updated ${this.changes} bills dates.`);
  });
});

db.close();
