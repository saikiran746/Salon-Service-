const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT id, email, password, is_active FROM users WHERE email LIKE '%lakadaramkalyan7@gmail.com%'", async (err, rows) => {
  if (err) console.error(err);
  else {
    console.log(rows);
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare('kalyan123', rows[0].password);
    console.log('Password match:', isMatch);
  }
});
