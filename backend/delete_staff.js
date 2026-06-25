const db = require('./src/config/database'); 
async function removeStaff() { 
  try { 
    await db.testConnection(); 
    await db.pool.execute("DELETE FROM staff WHERE LOWER(name) LIKE '%sai kumar%'"); 
    console.log('Successfully deleted Sai Kumar from staff members.'); 
    process.exit(0); 
  } catch(e) { 
    console.error('Error:', e); 
    process.exit(1); 
  } 
} 
removeStaff();
