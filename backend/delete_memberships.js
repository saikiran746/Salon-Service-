const db = require('./src/config/database'); 
async function removeMemberships() { 
  try { 
    await db.testConnection(); 
    await db.pool.execute("DELETE FROM membership_plans WHERE LOWER(name) IN ('silver', 'sliver', 'gold', 'platinum')"); 
    console.log('Successfully deleted Silver, Gold, and Platinum plans.'); 
    process.exit(0); 
  } catch(e) { 
    console.error('Error:', e); 
    process.exit(1); 
  } 
} 
removeMemberships();
