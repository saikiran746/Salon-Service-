const sqlite3 = require('sqlite3'); 
const db = new sqlite3.Database('database.sqlite'); 
db.all("SELECT count(*) as count FROM customers WHERE LOWER(name) LIKE '%walk-in%'", (err, rows) => { 
  if(err) console.error(err); 
  console.log(rows); 
});
