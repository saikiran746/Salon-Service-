const { Pool } = require('pg'); 
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_Fv0eAMsdRY5y@ep-small-mode-aqvem5i8.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require' }); 
pool.query("ALTER TABLE bills ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC', ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';").then(res => { 
  console.log('Altered columns'); 
  pool.end(); 
}).catch(e => { 
  console.error(e); 
  pool.end(); 
});
