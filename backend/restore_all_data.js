const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { pool, testConnection } = require('./src/config/database');

async function run() {
  const dbPath = path.resolve(__dirname, 'database.sqlite');
  const db = new sqlite3.Database(dbPath);

  const fetchTable = (table) => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM ${table}`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  try {
    const users = await fetchTable('users');
    const customers = await fetchTable('customers');
    const services = await fetchTable('services');
    const staff = await fetchTable('staff');
    const appointments = await fetchTable('appointments');
    const bills = await fetchTable('bills');
    const billItems = await fetchTable('bill_items');

    console.log(`SQLite Stats: ${users.length} users, ${customers.length} customers, ${services.length} services, ${staff.length} staff, ${appointments.length} appointments, ${bills.length} bills, ${billItems.length} bill items.`);

    await testConnection();

    // Ensure staff column "gender" exists in PG
    try {
      await pool.execute('ALTER TABLE staff ADD COLUMN IF NOT EXISTS gender VARCHAR(50)');
    } catch(err) {
      console.log('ALTER TABLE staff gender column warning:', err.message);
    }

    // 0. Restore Users
    let usersCount = 0;
    for (const u of users) {
      try {
        await pool.execute(
          `INSERT INTO users (id, name, email, phone, password, role, is_active, last_login, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING`,
          [u.id, u.name, u.email, u.phone, u.password, u.role, u.is_active, u.last_login, u.created_at, u.updated_at]
        );
        usersCount++;
      } catch (err) {
        console.error(`Error inserting user ${u.id}:`, err.message);
      }
    }
    console.log(`Migrated ${usersCount} users.`);

    // 1. Restore Customers
    let custCount = 0;
    for (const c of customers) {
      try {
        await pool.execute(
          `INSERT INTO customers (id, user_id, name, email, phone, date_of_birth, gender, address, notes, source, membership_id, membership_expiry, total_visits, total_spent, last_visit, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING`,
          [c.id, c.user_id, c.name, c.email, c.phone, c.date_of_birth, c.gender, c.address, c.notes, c.source, c.membership_id, c.membership_expiry, c.total_visits, c.total_spent, c.last_visit, c.created_at, c.updated_at]
        );
        custCount++;
      } catch (err) {
        console.error(`Error inserting customer ${c.id}:`, err.message);
      }
    }
    console.log(`Migrated ${custCount} customers.`);

    // 2. Restore Services
    let svcCount = 0;
    for (const s of services) {
      try {
        await pool.execute(
          `INSERT INTO services (id, name, description, duration, price, specialist_type, category, image, image_public_id, sort_order, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING`,
          [s.id, s.name, s.description, s.duration, s.price, s.specialist_type, s.category, s.image, s.image_public_id, s.sort_order, s.is_active, s.created_at, s.updated_at]
        );
        svcCount++;
      } catch (err) {
        console.error(`Error inserting service ${s.id}:`, err.message);
      }
    }
    console.log(`Migrated ${svcCount} services.`);

    // 3. Restore Staff
    let staffCount = 0;
    for (const st of staff) {
      try {
        await pool.execute(
          `INSERT INTO staff (id, name, email, phone, gender, experience, specializations, bio, photo, photo_public_id, rating, review_count, total_clients, total_revenue, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING`,
          [st.id, st.name, st.email, st.phone, st.gender, st.experience, st.specializations, st.bio, st.photo, st.photo_public_id, st.rating, st.review_count, st.total_clients, st.total_revenue, st.is_active, st.created_at, st.updated_at]
        );
        staffCount++;
      } catch (err) {
        console.error(`Error inserting staff ${st.id}:`, err.message);
      }
    }
    console.log(`Migrated ${staffCount} staff.`);

    // 4. Restore Appointments
    let apptCount = 0;
    for (const a of appointments) {
      try {
        await pool.execute(
          `INSERT INTO appointments (id, customer_id, service_id, staff_id, appointment_date, appointment_time, duration, price, notes, status, source, bill_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING`,
          [a.id, a.customer_id, a.service_id, a.staff_id, a.appointment_date, a.appointment_time, a.duration, a.price, a.notes, a.status, a.source, a.bill_id, a.created_at, a.updated_at]
        );
        apptCount++;
      } catch (err) {
        console.error(`Error inserting appointment ${a.id}:`, err.message);
      }
    }
    console.log(`Migrated ${apptCount} appointments.`);

    // 5. Restore Bills
    let billsCount = 0;
    for (const bill of bills) {
      try {
        await pool.execute(
          `INSERT INTO bills (id, invoice_number, appointment_id, customer_id, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total_amount, payment_method, status, pdf_path, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING`,
          [
            bill.id, bill.invoice_number, bill.appointment_id, bill.customer_id,
            bill.subtotal, bill.discount_percent, bill.discount_amount,
            bill.tax_percent, bill.tax_amount, bill.total_amount,
            bill.payment_method, bill.status, bill.pdf_path,
            bill.created_at, bill.updated_at
          ]
        );
        billsCount++;
      } catch (err) {
        console.error(`Error inserting bill ${bill.id}:`, err.message);
      }
    }
    console.log(`Migrated ${billsCount} bills.`);

    // 6. Restore Bill Items
    let itemsCount = 0;
    for (const item of billItems) {
      try {
        await pool.execute(
          `INSERT INTO bill_items (id, bill_id, description, quantity, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING`,
          [item.id, item.bill_id, item.description, item.quantity, item.unit_price, item.total_price]
        );
        itemsCount++;
      } catch (err) {
        console.error(`Error inserting bill item ${item.id}:`, err.message);
      }
    }
    console.log(`Migrated ${itemsCount} bill items.`);

    console.log('🎉 Data sync completed successfully.');

  } catch(e) {
    console.error('Data migration error:', e.message);
  } finally {
    db.close();
    process.exit(0);
  }
}

run();
