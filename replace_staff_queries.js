const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend/src/controllers/combined.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace SELECT st.id... walksins, revenue
let countReplaces = 0;
while (content.includes(`                 COUNT(DISTINCT CASE WHEN LOWER(a.source) = 'walk-in' THEN b.id END) AS walkins,
                 COALESCE(SUM(b.total_amount), 0) AS revenue,`)) {
  content = content.replace(
    `                 COUNT(DISTINCT CASE WHEN LOWER(a.source) = 'walk-in' THEN b.id END) AS walkins,
                 COALESCE(SUM(b.total_amount), 0) AS revenue,`,
    `                 COUNT(DISTINCT CASE WHEN LOWER(a.source) = 'walk-in' OR b.appointment_id IS NULL THEN b.id END) AS walkins,
                 COALESCE(SUM(bi.final_amount), 0) AS revenue,`
  );
  countReplaces++;
}

// Replace Postgres FROM staff
content = content.replace(
  `          FROM staff st
          LEFT JOIN appointments a ON a.staff_id = st.id AND a.status = 'completed'
          LEFT JOIN bills b ON a.bill_id = b.id AND b.status = 'paid'`,
  `          FROM staff st
          LEFT JOIN bill_items bi ON bi.description LIKE '%' || st.name || ')'
          LEFT JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
          LEFT JOIN appointments a ON b.appointment_id = a.id`
);

// Replace SQLite FROM staff
content = content.replace(
  `          FROM staff st
          LEFT JOIN appointments a ON a.staff_id = st.id AND a.status = 'completed'
          LEFT JOIN bills b ON a.bill_id = b.id AND b.status = 'paid'`,
  `          FROM staff st
          LEFT JOIN bill_items bi ON bi.description LIKE '%' || st.name || ')'
          LEFT JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
          LEFT JOIN appointments a ON b.appointment_id = a.id`
);

// Replace MySQL FROM staff
content = content.replace(
  `          FROM staff st
          LEFT JOIN appointments a ON a.staff_id = st.id AND a.status = 'completed'
          LEFT JOIN bills b ON a.bill_id = b.id AND b.status = 'paid'`,
  `          FROM staff st
          LEFT JOIN bill_items bi ON bi.description LIKE CONCAT('%(', st.name, ')')
          LEFT JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
          LEFT JOIN appointments a ON b.appointment_id = a.id`
);

// Replace Postgres revByStaff
content = content.replace(
  `          SELECT st.name, COALESCE(SUM(a.price), 0) AS revenue, COUNT(a.id) AS services
          FROM staff st
          LEFT JOIN appointments a ON a.staff_id = st.id AND a.status = 'completed'
            AND a.appointment_date >= CURRENT_DATE - INTERVAL '30 day'`,
  `          SELECT st.name, COALESCE(SUM(bi.final_amount), 0) AS revenue, COUNT(bi.id) AS services
          FROM staff st
          LEFT JOIN bill_items bi ON bi.description LIKE '%' || st.name || ')'
          LEFT JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
            AND b.created_at >= CURRENT_DATE - INTERVAL '30 day'`
);

// Replace SQLite revByStaff
content = content.replace(
  `          SELECT st.name, COALESCE(SUM(a.price), 0) AS revenue, COUNT(a.id) AS services
          FROM staff st
          LEFT JOIN appointments a ON a.staff_id = st.id AND a.status = 'completed'
            AND a.appointment_date >= date('now', '-30 days')`,
  `          SELECT st.name, COALESCE(SUM(bi.final_amount), 0) AS revenue, COUNT(bi.id) AS services
          FROM staff st
          LEFT JOIN bill_items bi ON bi.description LIKE '%' || st.name || ')'
          LEFT JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
            AND b.created_at >= date('now', '-30 days')`
);

// Replace MySQL revByStaff
content = content.replace(
  `          SELECT st.name, COALESCE(SUM(a.price), 0) AS revenue, COUNT(a.id) AS services
          FROM staff st
          LEFT JOIN appointments a ON a.staff_id = st.id AND a.status = 'completed'
            AND a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
  `          SELECT st.name, COALESCE(SUM(bi.final_amount), 0) AS revenue, COUNT(bi.id) AS services
          FROM staff st
          LEFT JOIN bill_items bi ON bi.description LIKE CONCAT('%(', st.name, ')')
          LEFT JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
            AND b.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
);

// Replace Postgres monthlyQuery
content = content.replace(
  `          SELECT TO_CHAR(a.appointment_date, 'YYYY-MM') AS month, st.name,
                 COUNT(a.id) AS appointments, COALESCE(SUM(a.price), 0) AS revenue
          FROM appointments a JOIN staff st ON a.staff_id = st.id
          WHERE a.status = 'completed' AND a.appointment_date >= CURRENT_DATE - INTERVAL '6 MONTH'`,
  `          SELECT TO_CHAR(b.created_at, 'YYYY-MM') AS month, st.name,
                 COUNT(DISTINCT b.id) AS appointments, COALESCE(SUM(bi.final_amount), 0) AS revenue
          FROM bill_items bi
          JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
          JOIN staff st ON bi.description LIKE '%' || st.name || ')'
          WHERE b.created_at >= CURRENT_DATE - INTERVAL '6 MONTH'`
);

// Replace SQLite monthlyQuery
content = content.replace(
  `          SELECT strftime('%Y-%m', a.appointment_date) AS month, st.name,
                 COUNT(a.id) AS appointments, COALESCE(SUM(a.price), 0) AS revenue
          FROM appointments a JOIN staff st ON a.staff_id = st.id
          WHERE a.status = 'completed' AND a.appointment_date >= date('now', '-6 months')`,
  `          SELECT strftime('%Y-%m', b.created_at) AS month, st.name,
                 COUNT(DISTINCT b.id) AS appointments, COALESCE(SUM(bi.final_amount), 0) AS revenue
          FROM bill_items bi
          JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
          JOIN staff st ON bi.description LIKE '%' || st.name || ')'
          WHERE b.created_at >= date('now', '-6 months')`
);

// Replace MySQL monthlyQuery
content = content.replace(
  `          SELECT DATE_FORMAT(a.appointment_date, '%Y-%m') AS month, st.name,
                 COUNT(a.id) AS appointments, COALESCE(SUM(a.price), 0) AS revenue
          FROM appointments a JOIN staff st ON a.staff_id = st.id
          WHERE a.status = 'completed' AND a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)`,
  `          SELECT DATE_FORMAT(b.created_at, '%Y-%m') AS month, st.name,
                 COUNT(DISTINCT b.id) AS appointments, COALESCE(SUM(bi.final_amount), 0) AS revenue
          FROM bill_items bi
          JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
          JOIN staff st ON bi.description LIKE CONCAT('%(', st.name, ')')
          WHERE b.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)`
);

// staffDetail servicesQuery
content = content.replace(
  `        SELECT 
          s.name,
          COUNT(a.id) as count,
          SUM(CASE WHEN a.source != 'online' OR a.source IS NULL THEN 1 ELSE 0 END) as walk_ins,
          SUM(CASE WHEN a.source = 'online' THEN 1 ELSE 0 END) as booked,
          SUM(CASE WHEN LOWER(COALESCE(c.gender, b.customer_gender)) = 'male' THEN 1 ELSE 0 END) as male,
          SUM(CASE WHEN LOWER(COALESCE(c.gender, b.customer_gender)) = 'female' THEN 1 ELSE 0 END) as female,
          SUM(a.price) as revenue
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        LEFT JOIN bills b ON a.bill_id = b.id
        LEFT JOIN customers c ON c.id = COALESCE(b.customer_id, a.customer_id)
        WHERE a.staff_id = ? AND a.status = 'completed'
        GROUP BY s.id, s.name`,
  `        SELECT 
          s.name,
          COUNT(bi.id) as count,
          SUM(CASE WHEN a.source != 'online' OR a.source IS NULL THEN 1 ELSE 0 END) as walk_ins,
          SUM(CASE WHEN a.source = 'online' THEN 1 ELSE 0 END) as booked,
          SUM(CASE WHEN LOWER(COALESCE(c.gender, b.customer_gender)) = 'male' THEN 1 ELSE 0 END) as male,
          SUM(CASE WHEN LOWER(COALESCE(c.gender, b.customer_gender)) = 'female' THEN 1 ELSE 0 END) as female,
          SUM(bi.final_amount) as revenue
        FROM staff st
        JOIN bill_items bi ON bi.description LIKE '%' || st.name || ')'
        JOIN bills b ON bi.bill_id = b.id AND b.status = 'paid'
        LEFT JOIN appointments a ON b.appointment_id = a.id
        LEFT JOIN services s ON bi.description LIKE s.name || ' %' OR bi.description = s.name
        LEFT JOIN customers c ON c.id = COALESCE(b.customer_id, a.customer_id)
        WHERE st.id = ?
        GROUP BY s.id, s.name`
);

// Wait, the MySQL version of servicesQuery should use CONCAT for the LIKE clause if useSqlite is false!
// But the staffDetail is a single query for all dialects in combined.js right now:
// Let's replace the single servicesQuery to use parameterized logic or universal LIKE (wait, SQLite requires ||, MySQL requires CONCAT).
// Let's see if we can use a small db.usePostgres / db.useSqlite switch inside staffDetail!

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced', countReplaces, 'walkin counts');
