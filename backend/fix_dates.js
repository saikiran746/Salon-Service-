const { Pool } = require('pg'); 
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_Fv0eAMsdRY5y@ep-small-mode-aqvem5i8.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require' }); 
pool.query("UPDATE bills SET created_at = replace(created_at, ' ', 'T') || 'Z' WHERE created_at NOT LIKE '%T%' AND created_at NOT LIKE '%Z%'").then(res => { 
  console.log('Fixed bills rows:', res.rowCount); 
  pool.end(); 
}).catch(e => { 
  console.error(e); 
  pool.end(); 
});
