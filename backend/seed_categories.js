const crypto = require('crypto');
const db = require('c:/Users/hi/Downloads/completely new/backend/src/config/database');

const services = [
  // --- DRY & DEHYDRATED SKIN ---
  { category: 'Dry & Dehydrated Skin', name: 'Dermalogica - Ultimate Hydrating Treatment', price: 2200, duration: 60 },
  { category: 'Dry & Dehydrated Skin', name: 'Dermalogica - Skin Brightening', price: 4000, duration: 60 },
  { category: 'Dry & Dehydrated Skin', name: 'Skin Regimen - Illuminating & Hydrating clean up', price: 2000, duration: 45 },
  { category: 'Dry & Dehydrated Skin', name: 'Skin Regimen - Illuminating & Hydrating facial', price: 3800, duration: 60 },
  { category: 'Dry & Dehydrated Skin', name: 'Skin Regimen - Hydramemory biphasic mask (ADD-ON)', price: 2000, duration: 20 },
  { category: 'Dry & Dehydrated Skin', name: 'Seasoul - Clean Up Ritual', price: 1300, duration: 45 },
  { category: 'Dry & Dehydrated Skin', name: 'Seasoul - Advanced Tan Removal', price: 2500, duration: 60 },
  { category: 'Dry & Dehydrated Skin', name: 'Christine Valmy - Hydra Lock', price: 1300, duration: 45 },
  { category: 'Dry & Dehydrated Skin', name: 'Christine Valmy - Brightening', price: 1800, duration: 60 },
  { category: 'Add-on to any treatment', name: 'Detan (Face & Neck)', price: 1300, duration: 20 },
  { category: 'Add-on to any treatment', name: 'Under Eye Treatment', price: 750, duration: 20 },
  { category: 'Add-on to any treatment', name: 'Snow Whiteface Pack', price: 1000, duration: 20 },

  // --- AGEING SKIN ---
  { category: 'Ageing Skin', name: 'Dermalogica - Multi Vitamin Ageing', price: 4000, duration: 60 },
  { category: 'Ageing Skin', name: 'Dermalogica - Skin Brightening', price: 4000, duration: 60 },
  { category: 'Ageing Skin', name: 'Skin Regimen - Anti-ageing clean up', price: 1800, duration: 45 },
  { category: 'Ageing Skin', name: 'Skin Regimen - Anti-ageing facial', price: 3800, duration: 60 },
  { category: 'Ageing Skin', name: 'Skin Regimen - Active pureness peel off mask (ADD-ON)', price: 2000, duration: 20 },
  { category: 'Ageing Skin', name: 'Seasoul - Clean Up Ritual', price: 1300, duration: 45 },
  { category: 'Ageing Skin', name: 'Seasoul - Anti Ageing', price: 2300, duration: 60 },
  { category: 'Ageing Skin', name: 'Christine Valmy - Anti Ageing', price: 1600, duration: 45 },
  { category: 'Ageing Skin', name: 'Christine Valmy - C V Signature', price: 2000, duration: 60 },

  // --- OILY SKIN & ACNE ---
  { category: 'Oily Skin & Acne', name: 'Dermalogica - Medibac Acne Facial', price: 3000, duration: 60 },
  { category: 'Oily Skin & Acne', name: 'Dermalogica - Skin Brightening', price: 4000, duration: 60 },
  { category: 'Oily Skin & Acne', name: 'Skin Regimen - Purifying clean up', price: 2000, duration: 45 },
  { category: 'Oily Skin & Acne', name: 'Skin Regimen - Purification facial', price: 3800, duration: 60 },
  { category: 'Oily Skin & Acne', name: 'Skin Regimen - Active pureness peel off mask (ADD-ON)', price: 2000, duration: 20 },
  { category: 'Oily Skin & Acne', name: 'Seasoul - Clean Up Ritual', price: 1300, duration: 45 },
  { category: 'Oily Skin & Acne', name: 'Seasoul - Acne control', price: 2300, duration: 60 },
  { category: 'Oily Skin & Acne', name: 'Christine Valmy - Grease Control', price: 1300, duration: 45 },
  { category: 'Oily Skin & Acne', name: 'Christine Valmy - Anti Acne Treatment', price: 1800, duration: 60 },

  // --- MANICURE ---
  { category: 'Manicure', name: 'Deluxe Manicure', price: 600, duration: 30 },
  { category: 'Manicure', name: 'Icecream Manicure', price: 1000, duration: 40 },
  { category: 'Manicure', name: 'Dead Sea Manicure', price: 800, duration: 35 },
  { category: 'Manicure', name: 'Luxury Manicure', price: 1200, duration: 45 },
  { category: 'Manicure', name: 'Cut & File', price: 200, duration: 15 },
  { category: 'Manicure', name: 'Nailpaint', price: 300, duration: 15 },
  { category: 'Manicure', name: 'French Polish', price: 450, duration: 20 },

  // --- PEDICURE ---
  { category: 'Pedicure', name: 'Deluxe Pedicure', price: 900, duration: 30 },
  { category: 'Pedicure', name: 'Icecream Pedicure', price: 1500, duration: 45 },
  { category: 'Pedicure', name: 'Dead Sea Pedicure', price: 1000, duration: 35 },
  { category: 'Pedicure', name: 'Luxury Pedicure', price: 2000, duration: 45 },
  { category: 'Pedicure', name: 'Bomb Pedicure', price: 200, duration: 45 },
  { category: 'Pedicure', name: 'Cut & File', price: 300, duration: 15 },
  { category: 'Pedicure', name: 'Nail Polish', price: 250, duration: 15 },

  // --- MANI/PEDI ADD-ON ---
  { category: 'Add-on', name: 'Bleach', price: 250, duration: 15 },
  { category: 'Add-on', name: 'Paraffin Wax', price: 300, duration: 20 },
  { category: 'Add-on', name: 'Heel Peel Treatment', price: 1500, duration: 30 },

  // --- BLEACHING & DE-TAN ---
  { category: 'Bleaching & De-Tan', name: 'Upperlip', price: 150, duration: 15 },
  { category: 'Bleaching & De-Tan', name: 'Nape', price: 150, duration: 15 },
  { category: 'Bleaching & De-Tan', name: 'Feet', price: 300, duration: 20 },
  { category: 'Bleaching & De-Tan', name: 'Underarms', price: 300, duration: 15 },
  { category: 'Bleaching & De-Tan', name: 'Face & Neck', price: 1300, duration: 30 },
  { category: 'Bleaching & De-Tan', name: 'Half Arms', price: 1500, duration: 30 },
  { category: 'Bleaching & De-Tan', name: 'Full Arms', price: 1800, duration: 40 },
  { category: 'Bleaching & De-Tan', name: 'Half Legs', price: 1500, duration: 30 },
  { category: 'Bleaching & De-Tan', name: 'Full Legs', price: 2000, duration: 45 },
  { category: 'Bleaching & De-Tan', name: 'Upper Back', price: 1000, duration: 20 },
  { category: 'Bleaching & De-Tan', name: 'Lower Back', price: 1000, duration: 20 },
  { category: 'Bleaching & De-Tan', name: 'Full Back', price: 1500, duration: 30 },
  { category: 'Bleaching & De-Tan', name: 'Midriff', price: 1000, duration: 20 },
  { category: 'Bleaching & De-Tan', name: 'Bikini', price: 1500, duration: 30 },
  { category: 'Bleaching & De-Tan', name: 'Brazilian', price: 1500, duration: 45 },
  { category: 'Bleaching & De-Tan', name: 'Full Body', price: 4000, duration: 90 },

  // --- THREADING ---
  { category: 'Threading', name: 'Eyebrows', price: 60, duration: 10 },
  { category: 'Threading', name: 'Upperlip', price: 60, duration: 5 },
  { category: 'Threading', name: 'Chin', price: 60, duration: 5 },
  { category: 'Threading', name: 'Forehead', price: 60, duration: 5 },
  { category: 'Threading', name: 'Sides', price: 80, duration: 10 },
  { category: 'Threading', name: 'Neck', price: 100, duration: 10 },
  { category: 'Threading', name: 'Full Face', price: 400, duration: 30 }
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

    console.log(`Successfully added ${count} categorized services!`);
    process.exit(0);
  } catch (e) {
    console.error('Failed:', e);
    process.exit(1);
  }
}

seed();
