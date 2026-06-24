const db = require('c:/Users/hi/Downloads/toni-and-guy-salon-management/toni-and-guy-salon-management/backend/src/config/database');
const { pool, testConnection } = db;

async function run() {
  try {
    await testConnection();
    const today = new Date();
    const promises = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1;
      const monthLabel = d.toLocaleString('en-US', { month: 'short' });
      
      const start = `${year}-${String(monthNum).padStart(2, '0')}-01 00:00:00`;
      const lastDay = new Date(year, monthNum, 0).getDate();
      const end = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')} 23:59:59`;
      
      promises.push((async () => {
        const [[row]] = await pool.execute(
          `SELECT COUNT(DISTINCT customer_id) AS count 
           FROM membership_purchases 
           WHERE purchased_at <= ? AND expires_at >= ?`,
          [end, start]
        );
        return {
          month: monthLabel,
          members: parseInt(row?.count || 0),
          range: `${start} to ${end}`
        };
      })());
    }

    const chartData = await Promise.all(promises);
    console.log('--- Calculated Membership Growth Chart Data ---');
    console.log(JSON.stringify(chartData, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
