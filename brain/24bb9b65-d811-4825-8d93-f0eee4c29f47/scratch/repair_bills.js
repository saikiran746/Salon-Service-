const { testConnection, pool } = require('c:/Users/BK RAMADEVI/Desktop/latest salon/ToniAndGuy-SalonApp-Updated/backend/src/config/database');
const { v4: uuidv4 } = require('c:/Users/BK RAMADEVI/Desktop/latest salon/ToniAndGuy-SalonApp-Updated/backend/node_modules/uuid');

async function repair() {
  await testConnection();
  
  // Find service ID for 'Senior Stylist Haircut'
  const [services] = await pool.execute("SELECT id FROM services WHERE name = 'Senior Stylist Haircut' LIMIT 1");
  const serviceId = services[0]?.id || 'manual-service';
  console.log('Service ID:', serviceId);

  // Find bills created on June 23, 2026
  const [bills] = await pool.execute(`
    SELECT id, invoice_number, customer_id, total_amount, created_at 
    FROM bills 
    WHERE invoice_number IN ('INV-202606-8128', 'INV-202606-5214', 'INV-202606-6779')
  `);
  console.log('Bills to repair:', bills);

  for (const bill of bills) {
    // Check if appointment already exists for this bill to avoid duplicate repair
    const [existingAppts] = await pool.execute("SELECT id FROM appointments WHERE bill_id = ?", [bill.id]);
    if (existingAppts.length > 0) {
      console.log(`Bill ${bill.invoice_number} already linked to appointment(s). Skipping.`);
      continue;
    }

    const apptId = uuidv4();
    const createdTime = bill.created_at;
    
    // Create completed appointment linking Arjun (cdf89662-41ea-403a-ad8f-b75dfee66308)
    await pool.execute(
      `INSERT INTO appointments (id, customer_id, service_id, staff_id, appointment_date, appointment_time, price, status, source, bill_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', 'walk-in', ?, ?)`,
      [
        apptId,
        bill.customer_id,
        serviceId,
        'cdf89662-41ea-403a-ad8f-b75dfee66308', // Arjun
        '2026-06-23',
        '03:45:00',
        450.00, // pre-tax price for Senior Stylist Haircut
        bill.id,
        createdTime
      ]
    );

    // Update bill
    await pool.execute("UPDATE bills SET appointment_id = ? WHERE id = ?", [apptId, bill.id]);
    console.log(`Linked bill ${bill.invoice_number} to new completed appointment ${apptId}`);
  }

  console.log('Repair complete!');
}

repair().catch(console.error);
