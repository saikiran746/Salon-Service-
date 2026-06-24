const { testConnection, pool } = require('c:/Users/BK RAMADEVI/Desktop/latest salon/ToniAndGuy-SalonApp-Updated/backend/src/config/database');

async function check() {
  await testConnection();
  const [rows] = await pool.execute(`
    SELECT 
      SUM(a.price) AS sum_appt_price,
      SUM(b.total_amount) AS sum_bill_total
    FROM staff st
    LEFT JOIN appointments a ON a.staff_id = st.id AND a.status = 'completed'
    LEFT JOIN bills b ON a.bill_id = b.id AND b.status = 'paid'
    WHERE st.id = 'cdf89662-41ea-403a-ad8f-b75dfee66308'
  `);
  console.log(rows);
}

check().catch(console.error);
