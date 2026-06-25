const crypto = require('crypto');
const db = require('c:/Users/hi/Downloads/completely new/backend/src/config/database');

const services = [
  // --- SENSITIVE & SENSITISED SKIN ---
  { category: 'Sensitive Skin', name: 'Dermalogica - Environment Control Facial', price: 3500, duration: 60 },
  { category: 'Sensitive Skin', name: 'Dermalogica - Skin Brightening', price: 4000, duration: 60 },
  { category: 'Sensitive Skin', name: 'Seasoul - Clean Up Ritual', price: 1300, duration: 45 },
  { category: 'Sensitive Skin', name: 'Seasoul - Ultra soothing and Calming Treatment', price: 2300, duration: 60 },

  // --- WAXING (Premium) ---
  { category: 'Waxing (Premium)', name: 'Premium Wax - Upper lip', price: 100, duration: 10 },
  { category: 'Waxing (Premium)', name: 'Premium Wax - Chin', price: 100, duration: 10 },
  { category: 'Waxing (Premium)', name: 'Premium Wax - Sides', price: 200, duration: 15 },
  { category: 'Waxing (Premium)', name: 'Premium Wax - Neck', price: 200, duration: 15 },
  { category: 'Waxing (Premium)', name: 'Premium Wax - Nape', price: 300, duration: 15 },
  { category: 'Waxing (Premium)', name: 'Premium Wax - Underarms', price: 300, duration: 15 },
  { category: 'Waxing (Premium)', name: 'Premium Wax - Half Arms', price: 450, duration: 20 },
  { category: 'Waxing (Premium)', name: 'Premium Wax - Full Arms', price: 700, duration: 30 },
  { category: 'Waxing (Premium)', name: 'Premium Wax - Half Legs', price: 600, duration: 30 },
  { category: 'Waxing (Premium)', name: 'Premium Wax - Full Legs', price: 900, duration: 45 },
  { category: 'Waxing (Premium)', name: 'Premium Wax - Full Front/ Back', price: 600, duration: 30 },
  { category: 'Waxing (Premium)', name: 'Premium Wax - Upper/ Lower Back', price: 400, duration: 20 },
  { category: 'Waxing (Premium)', name: 'Premium Wax - Midriff', price: 500, duration: 20 },
  { category: 'Waxing (Premium)', name: 'Premium Wax - Bikini Line', price: 2000, duration: 30 },
  { category: 'Waxing (Premium)', name: 'Premium Wax - Bikini Wax', price: 3000, duration: 45 },
  { category: 'Waxing (Premium)', name: 'Premium Wax - Full Body (Without Bikini)', price: 4000, duration: 90 },
  { category: 'Waxing (Premium)', name: 'Premium Wax - Full Body (With Bikini)', price: 4500, duration: 120 },

  // --- WAXING (Regular) ---
  { category: 'Waxing (Regular)', name: 'Regular Wax - Upper lip', price: 60, duration: 10 },
  { category: 'Waxing (Regular)', name: 'Regular Wax - Chin', price: 60, duration: 10 },
  { category: 'Waxing (Regular)', name: 'Regular Wax - Sides', price: 60, duration: 15 },
  { category: 'Waxing (Regular)', name: 'Regular Wax - Neck', price: 60, duration: 15 },
  { category: 'Waxing (Regular)', name: 'Regular Wax - Underarms', price: 200, duration: 15 },
  { category: 'Waxing (Regular)', name: 'Regular Wax - Half Arms', price: 350, duration: 20 },
  { category: 'Waxing (Regular)', name: 'Regular Wax - Full Arms', price: 600, duration: 30 },
  { category: 'Waxing (Regular)', name: 'Regular Wax - Half Legs', price: 500, duration: 30 },
  { category: 'Waxing (Regular)', name: 'Regular Wax - Full Legs', price: 700, duration: 45 },
  { category: 'Waxing (Regular)', name: 'Regular Wax - Full Front/ Back', price: 500, duration: 30 },
  { category: 'Waxing (Regular)', name: 'Regular Wax - Upper/ Lower Back', price: 350, duration: 20 },
  { category: 'Waxing (Regular)', name: 'Regular Wax - Midriff', price: 400, duration: 20 },

  // --- WAXING (Brazilian) ---
  { category: 'Waxing (Brazilian)', name: 'Brazilian Wax - Underarms', price: 600, duration: 20 },
  { category: 'Waxing (Brazilian)', name: 'Brazilian Wax - Full Body (Without Bikini)', price: 2500, duration: 90 },
  { category: 'Waxing (Brazilian)', name: 'Brazilian Wax - Full Body (With Bikini)', price: 3000, duration: 120 }
];

async function seed() {
  try {
    await db.testConnection();
    let count = 0;
    
    for (const service of services) {
      const id = 'svc-' + crypto.randomUUID().substring(0, 8);
      await db.pool.execute(
        `INSERT INTO services (id, name, description, duration, price, category, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id, 
          service.name, 
          service.category + ' service', 
          service.duration, 
          service.price, 
          service.category, 
          1
        ]
      );
      count++;
    }
    
    console.log(`Successfully added ${count} MORE categorized services!`);
    process.exit(0);
  } catch (e) {
    console.error('Failed:', e);
    process.exit(1);
  }
}

seed();
