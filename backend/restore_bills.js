const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { pool, testConnection } = require('./src/config/database');

async function run() {
  const dbPath = path.resolve(__dirname, 'database.sqlite');
  const db = new sqlite3.Database(dbPath);

  await testConnection();

  db.all("SELECT * FROM bills", async (err, bills) => {
    if (err) {
      console.error("SQLite bills error:", err);
      return;
    }
    
    db.all("SELECT * FROM bill_items", async (err, billItems) => {
      if (err) {
        console.error("SQLite bill_items error:", err);
        return;
      }
      
      console.log(`Found ${bills.length} bills and ${billItems.length} bill items in SQLite.`);
      
      let restoredBills = 0;
      let restoredItems = 0;

      for (const bill of bills) {
        try {
          const [exists] = await pool.execute('SELECT id FROM bills WHERE id = ?', [bill.id]);
          if (exists.length === 0) {
            await pool.execute(
              `INSERT INTO bills (id, invoice_number, appointment_id, customer_id, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total_amount, payment_method, status, pdf_path, created_at, updated_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                bill.id,
                bill.invoice_number,
                bill.appointment_id || null,
                bill.customer_id || null,
                bill.subtotal || 0,
                bill.discount_percent || 0,
                bill.discount_amount || 0,
                bill.tax_percent || 0,
                bill.tax_amount || 0,
                bill.total_amount || 0,
                bill.payment_method || 'cash',
                bill.status || 'paid',
                bill.pdf_path || null,
                bill.created_at || new Date(),
                bill.updated_at || new Date()
              ]
            );
            restoredBills++;
          }
        } catch (e) {
          console.error("Error inserting bill", bill.id, e.message);
        }
      }

      for (const item of billItems) {
        try {
          const [exists] = await pool.execute('SELECT id FROM bill_items WHERE id = ?', [item.id]);
          if (exists.length === 0) {
            await pool.execute(
              `INSERT INTO bill_items (id, bill_id, description, quantity, unit_price, total_price, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                item.id,
                item.bill_id,
                item.description,
                item.quantity || 1,
                item.unit_price || 0,
                item.total_price || 0,
                item.created_at || new Date(),
                item.updated_at || new Date()
              ]
            );
            restoredItems++;
          }
        } catch (e) {
          console.error("Error inserting bill_item", item.id, e.message);
        }
      }

      console.log(`Successfully restored ${restoredBills} bills and ${restoredItems} bill items to PostgreSQL.`);
      process.exit(0);
    });
  });
}

run().catch(console.error);
