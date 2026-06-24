// ============================================================
// ANTI GRAVITY SALON — MOCK ANALYTICS DATA
// Realistic Indian salon data for premium dashboard demo
// ============================================================

export const kpiData = {
  todayRevenue: { value: 42850, prev: 38200, growth: 12.2, currency: '₹', sparkline: [28000, 31000, 35000, 29000, 38200, 42850] },
  monthlyRevenue: { value: 847500, prev: 762000, growth: 11.2, currency: '₹', sparkline: [620000, 680000, 710000, 695000, 762000, 847500] },
  totalAppointments: { value: 1284, prev: 1150, growth: 11.6, sparkline: [980, 1050, 1120, 1090, 1150, 1284] },
  walkIns: { value: 187, prev: 165, growth: 13.3, sparkline: [130, 142, 155, 148, 165, 187] },
  newClients: { value: 94, prev: 78, growth: 20.5, sparkline: [55, 62, 70, 65, 78, 94] },
  repeatClients: { value: 1190, prev: 1072, growth: 11.0, sparkline: [925, 988, 1050, 1025, 1072, 1190] },
  membershipRevenue: { value: 185000, prev: 162000, growth: 14.2, currency: '₹', sparkline: [125000, 138000, 150000, 145000, 162000, 185000] },
  productSales: { value: 67200, prev: 58900, growth: 14.1, currency: '₹', sparkline: [42000, 48000, 55000, 52000, 58900, 67200] },
  avgBillValue: { value: 2340, prev: 2180, growth: 7.3, currency: '₹', sparkline: [1950, 2050, 2150, 2100, 2180, 2340] },
  staffUtilization: { value: 87.4, prev: 82.1, growth: 6.5, unit: '%', sparkline: [74, 78, 82, 80, 82.1, 87.4] },
};

export const revenueMonthly = [
  { month: 'Jan', revenue: 612000, services: 480000, products: 82000, memberships: 50000 },
  { month: 'Feb', revenue: 698000, services: 545000, products: 91000, memberships: 62000 },
  { month: 'Mar', revenue: 743000, services: 578000, products: 98000, memberships: 67000 },
  { month: 'Apr', revenue: 715000, services: 552000, products: 95000, memberships: 68000 },
  { month: 'May', revenue: 762000, services: 587000, products: 102000, memberships: 73000 },
  { month: 'Jun', revenue: 847500, services: 595300, products: 67200, memberships: 185000 },
];

export const clientAnalytics = {
  total: 3842,
  newThisMonth: 94,
  repeatThisMonth: 1190,
  lost: 48,
  active: 2156,
  membershipHolders: 387,
  vipClients: 124,
  retentionRate: 78.4,
  avgLifetimeValue: 28450,

  newVsRepeat: [
    { name: 'Jan', new: 55, repeat: 925 },
    { name: 'Feb', new: 62, repeat: 988 },
    { name: 'Mar', new: 70, repeat: 1050 },
    { name: 'Apr', new: 65, repeat: 1025 },
    { name: 'May', new: 78, repeat: 1072 },
    { name: 'Jun', new: 94, repeat: 1190 },
  ],

  retentionTrend: [
    { month: 'Jan', rate: 72.1 },
    { month: 'Feb', rate: 74.5 },
    { month: 'Mar', rate: 76.8 },
    { month: 'Apr', rate: 75.2 },
    { month: 'May', rate: 77.9 },
    { month: 'Jun', rate: 78.4 },
  ],

  membershipGrowth: [
    { month: 'Jan', members: 298 },
    { month: 'Feb', members: 315 },
    { month: 'Mar', members: 334 },
    { month: 'Apr', members: 351 },
    { month: 'May', members: 368 },
    { month: 'Jun', members: 387 },
  ],

  visitFrequency: [
    { freq: '1x/month', clients: 485 },
    { freq: '2x/month', clients: 892 },
    { freq: '3x/month', clients: 634 },
    { freq: '4x+/month', clients: 145 },
    { freq: 'Rare', clients: 0 },
  ],

  topSpenders: [
    { name: 'Priya Sharma', visits: 24, spent: 87500, lastVisit: '2 days ago', tier: 'VIP' },
    { name: 'Meghna Reddy', visits: 21, spent: 74200, lastVisit: '5 days ago', tier: 'VIP' },
    { name: 'Anjali Verma', visits: 19, spent: 68900, lastVisit: '1 week ago', tier: 'VIP' },
    { name: 'Ritu Gupta', visits: 18, spent: 61400, lastVisit: '3 days ago', tier: 'Gold' },
    { name: 'Sneha Patel', visits: 16, spent: 55800, lastVisit: '2 weeks ago', tier: 'Gold' },
    { name: 'Kavya Nair', visits: 15, spent: 52100, lastVisit: '4 days ago', tier: 'Gold' },
    { name: 'Divya Kumar', visits: 14, spent: 48750, lastVisit: '1 week ago', tier: 'Silver' },
    { name: 'Pooja Singh', visits: 13, spent: 44200, lastVisit: '3 days ago', tier: 'Silver' },
  ],

  acquisitionSources: [
    { source: 'Instagram', leads: 245, converted: 184, revenue: 285000, color: '#E1306C' },
    { source: 'Facebook', leads: 198, converted: 142, revenue: 218000, color: '#1877F2' },
    { source: 'Google Ads', leads: 312, converted: 198, revenue: 324000, color: '#4285F4' },
    { source: 'Walk-in', leads: 187, converted: 187, revenue: 198000, color: '#C9A84C' },
    { source: 'Referral', leads: 156, converted: 128, revenue: 195000, color: '#10B981' },
    { source: 'Website', leads: 134, converted: 89, revenue: 142000, color: '#8B5CF6' },
    { source: 'WhatsApp', leads: 98, converted: 67, revenue: 98000, color: '#25D366' },
    { source: 'Influencer', leads: 72, converted: 42, revenue: 68000, color: '#FF6B35' },
  ],

  bookingSources: [
    { source: 'Walk-ins', value: 450, color: '#C9A84C' },
    { source: 'Phone Calls', value: 820, color: '#1877F2' },
    { source: 'Website', value: 312, color: '#8B5CF6' },
  ],
};

export const staffData = [
  {
    id: 1, name: 'Rahul Sharma', role: 'Senior Stylist', avatar: 'RS',
    revenue: 245000, services: 312, products: 38, memberships: 12,
    rating: 4.9, repeatRate: 68, productivity: 94, commission: 36750,
    rebookingRate: 68, avgServiceTime: 45, satisfaction: 4.9,
    totalClients: 312, maleClients: 202, femaleClients: 110,
    serviceBreakdown: [
      { service: 'Haircut', count: 120, revenue: 84000, walkins: 32, male: 78, female: 42 },
      { service: 'Hair Color', count: 55, revenue: 71500, walkins: 8, male: 15, female: 40 },
      { service: 'Beard Styling', count: 95, revenue: 28500, walkins: 45, male: 95, female: 0 },
      { service: 'Hair Spa', count: 35, revenue: 49000, walkins: 5, male: 12, female: 23 },
      { service: 'Keratin', count: 7, revenue: 28000, walkins: 1, male: 2, female: 5 },
    ],
    monthlyRevenue: [32000, 38000, 42000, 39000, 44000, 50000],
  },
  {
    id: 2, name: 'Priya Kapoor', role: 'Color Specialist', avatar: 'PK',
    revenue: 218500, services: 278, products: 52, memberships: 18,
    rating: 4.8, repeatRate: 72, productivity: 91, commission: 32775,
    rebookingRate: 72, avgServiceTime: 52, satisfaction: 4.8,
    totalClients: 278, maleClients: 64, femaleClients: 214,
    serviceBreakdown: [
      { service: 'Hair Color', count: 98, revenue: 127400, walkins: 14, male: 18, female: 80 },
      { service: 'Highlights', count: 62, revenue: 55800, walkins: 5, male: 12, female: 50 },
      { service: 'Keratin', count: 28, revenue: 22400, walkins: 2, male: 6, female: 22 },
      { service: 'Smoothening', count: 18, revenue: 9900, walkins: 1, male: 3, female: 15 },
      { service: 'Hair Spa', count: 72, revenue: 36000, walkins: 12, male: 25, female: 47 },
    ],
    monthlyRevenue: [28000, 34000, 38000, 36500, 40000, 42000],
  },
  {
    id: 3, name: 'Ankit Mehta', role: 'Senior Stylist', avatar: 'AM',
    revenue: 196000, services: 256, products: 41, memberships: 9,
    rating: 4.7, repeatRate: 64, productivity: 88, commission: 29400,
    rebookingRate: 64, avgServiceTime: 40, satisfaction: 4.7,
    totalClients: 256, maleClients: 211, femaleClients: 45,
    serviceBreakdown: [
      { service: 'Haircut', count: 142, revenue: 99400, walkins: 55, male: 110, female: 32 },
      { service: 'Beard Styling', count: 78, revenue: 23400, walkins: 35, male: 78, female: 0 },
      { service: 'Hair Spa', count: 28, revenue: 22400, walkins: 4, male: 18, female: 10 },
      { service: 'Hair Color', count: 8, revenue: 10400, walkins: 1, male: 5, female: 3 },
      { service: 'Facial', count: 0, revenue: 0, walkins: 0, male: 0, female: 0 },
    ],
    monthlyRevenue: [25000, 30000, 34000, 32000, 36000, 39000],
  },
  {
    id: 4, name: 'Sonal Agarwal', role: 'Beauty Expert', avatar: 'SA',
    revenue: 178000, services: 198, products: 67, memberships: 22,
    rating: 4.8, repeatRate: 76, productivity: 86, commission: 26700,
    rebookingRate: 76, avgServiceTime: 60, satisfaction: 4.8,
    totalClients: 379, maleClients: 59, femaleClients: 320,
    serviceBreakdown: [
      { service: 'Facial', count: 84, revenue: 84000, walkins: 18, male: 22, female: 62 },
      { service: 'Manicure', count: 72, revenue: 36000, walkins: 15, male: 14, female: 58 },
      { service: 'Pedicure', count: 58, revenue: 29000, walkins: 12, male: 10, female: 48 },
      { service: 'Threading', count: 120, revenue: 18000, walkins: 42, male: 8, female: 112 },
      { service: 'Waxing', count: 45, revenue: 13500, walkins: 8, male: 5, female: 40 },
    ],
    monthlyRevenue: [22000, 27000, 31000, 29500, 33000, 35500],
  },
  {
    id: 5, name: 'Vikram Nair', role: 'Stylist', avatar: 'VN',
    revenue: 142000, services: 189, products: 22, memberships: 6,
    rating: 4.5, repeatRate: 58, productivity: 79, commission: 21300,
    rebookingRate: 58, avgServiceTime: 38, satisfaction: 4.5,
    totalClients: 189, maleClients: 160, femaleClients: 29,
    serviceBreakdown: [
      { service: 'Haircut', count: 108, revenue: 75600, walkins: 45, male: 85, female: 23 },
      { service: 'Beard Styling', count: 65, revenue: 19500, walkins: 28, male: 65, female: 0 },
      { service: 'Hair Spa', count: 16, revenue: 12800, walkins: 3, male: 10, female: 6 },
      { service: 'Hair Color', count: 0, revenue: 0, walkins: 0, male: 0, female: 0 },
      { service: 'Keratin', count: 0, revenue: 0, walkins: 0, male: 0, female: 0 },
    ],
    monthlyRevenue: [18000, 22000, 25000, 23500, 26500, 27000],
  },
];


export const serviceAnalytics = [
  { name: 'Haircut', category: 'Hair', bookings: 487, revenue: 340900, profit: 272720, repeatRate: 82, growth: 14.2, color: '#C9A84C' },
  { name: 'Hair Color', category: 'Hair', bookings: 234, revenue: 304200, profit: 212940, repeatRate: 71, growth: 22.1, color: '#E8C96A' },
  { name: 'Keratin Treatment', category: 'Hair', bookings: 98, revenue: 196000, profit: 137200, repeatRate: 65, growth: 18.4, color: '#F0D98A' },
  { name: 'Facial', category: 'Skin', bookings: 184, revenue: 184000, profit: 128800, repeatRate: 74, growth: 9.8, color: '#10B981' },
  { name: 'Hair Spa', category: 'Hair', bookings: 212, revenue: 169600, profit: 118720, repeatRate: 68, growth: 12.5, color: '#34D399' },
  { name: 'Beard Styling', category: 'Grooming', bookings: 298, revenue: 89400, profit: 71520, repeatRate: 78, growth: 8.2, color: '#3B82F6' },
  { name: 'Manicure', category: 'Nails', bookings: 156, revenue: 78000, profit: 54600, repeatRate: 72, growth: 16.7, color: '#8B5CF6' },
  { name: 'Pedicure', category: 'Nails', bookings: 134, revenue: 67000, profit: 46900, repeatRate: 69, growth: 11.3, color: '#EC4899' },
  { name: 'Smoothening', category: 'Hair', bookings: 62, revenue: 124000, profit: 86800, repeatRate: 58, growth: 24.8, color: '#F59E0B' },
  { name: 'Waxing', category: 'Skin', bookings: 178, revenue: 53400, profit: 37380, repeatRate: 81, growth: 5.4, color: '#EF4444' },
];

export const appointmentData = {
  summary: {
    total: 1284,
    confirmed: 234,
    completed: 948,
    cancelled: 67,
    pending: 24,
    rescheduled: 11,
  },
  hourlyPeak: [
    { hour: '9AM', bookings: 28 }, { hour: '10AM', bookings: 56 },
    { hour: '11AM', bookings: 89 }, { hour: '12PM', bookings: 72 },
    { hour: '1PM', bookings: 48 }, { hour: '2PM', bookings: 94 },
    { hour: '3PM', bookings: 112 }, { hour: '4PM', bookings: 118 },
    { hour: '5PM', bookings: 134 }, { hour: '6PM', bookings: 98 },
    { hour: '7PM', bookings: 67 }, { hour: '8PM', bookings: 34 },
  ],
  dailyPeak: [
    { day: 'Mon', bookings: 156 }, { day: 'Tue', bookings: 142 },
    { day: 'Wed', bookings: 168 }, { day: 'Thu', bookings: 158 },
    { day: 'Fri', bookings: 192 }, { day: 'Sat', bookings: 248 },
    { day: 'Sun', bookings: 220 },
  ],
  monthlyTrend: [
    { month: 'Jan', total: 980, completed: 892, cancelled: 58, pending: 30 },
    { month: 'Feb', total: 1050, completed: 956, cancelled: 62, pending: 32 },
    { month: 'Mar', total: 1120, completed: 1024, cancelled: 68, pending: 28 },
    { month: 'Apr', total: 1090, completed: 995, cancelled: 65, pending: 30 },
    { month: 'May', total: 1150, completed: 1058, cancelled: 64, pending: 28 },
    { month: 'Jun', total: 1284, completed: 948, cancelled: 67, pending: 24 },
  ],
  heatmap: generateHeatmapData(),
};

function generateHeatmapData() {
  const data = [];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM'];
  days.forEach(day => {
    hours.forEach(hour => {
      const isWeekend = day === 'Sat' || day === 'Sun';
      const isPeakHour = ['3PM', '4PM', '5PM', '6PM'].includes(hour);
      let base = isWeekend ? 18 : 12;
      if (isPeakHour) base *= 1.5;
      data.push({ day, hour, bookings: Math.round(base + Math.random() * 8) });
    });
  });
  return data;
}

export const membershipData = {
  active: 387,
  expired: 142,
  renewals: 58,
  revenue: 185000,
  utilizationRate: 73.2,
  plans: [
    { name: 'Silver', members: 165, price: 2999, revenue: 69000, color: '#94A3B8' },
    { name: 'Gold', members: 142, price: 4999, revenue: 89000, color: '#C9A84C' },
    { name: 'Platinum', members: 80, price: 8999, revenue: 92000, color: '#E8C96A' },
  ],
  growthTrend: [
    { month: 'Jan', active: 298, expired: 98, revenue: 125000 },
    { month: 'Feb', active: 315, expired: 108, revenue: 138000 },
    { month: 'Mar', active: 334, expired: 118, revenue: 150000 },
    { month: 'Apr', active: 351, expired: 125, revenue: 158000 },
    { month: 'May', active: 368, expired: 132, revenue: 162000 },
    { month: 'Jun', active: 387, expired: 142, revenue: 185000 },
  ],
  expiringAlerts: [
    { name: 'Priya Sharma', plan: 'Platinum', expiresIn: 3, phone: '+91 98765 43210' },
    { name: 'Ritu Gupta', plan: 'Gold', expiresIn: 5, phone: '+91 87654 32109' },
    { name: 'Kavya Nair', plan: 'Silver', expiresIn: 7, phone: '+91 76543 21098' },
    { name: 'Sunita Rao', plan: 'Gold', expiresIn: 10, phone: '+91 65432 10987' },
    { name: 'Meena Joshi', plan: 'Silver', expiresIn: 12, phone: '+91 54321 09876' },
  ],
};

export const billingData = {
  totalBills: 1284,
  avgBillValue: 2340,
  highestBill: 18500,
  gstCollected: 85340,
  discountGiven: 42800,
  netRevenue: 847500,
  breakdown: [
    { name: 'Services', value: 595300, color: '#C9A84C' },
    { name: 'Memberships', value: 185000, color: '#8B5CF6' },
    { name: 'Packages', value: 0, color: '#10B981' },
  ],
  avgBillTrend: [
    { month: 'Jan', avg: 1950 }, { month: 'Feb', avg: 2050 },
    { month: 'Mar', avg: 2150 }, { month: 'Apr', avg: 2100 },
    { month: 'May', avg: 2180 }, { month: 'Jun', avg: 2340 },
  ],
  paymentMethods: [
    { method: 'UPI', txns: 642, amount: 421200 },
    { method: 'Card', txns: 384, amount: 298400 },
    { method: 'Cash', txns: 198, amount: 98600 },
    { method: 'Membership', txns: 60, amount: 29300 },
  ],
};

export const marketingData = [
  {
    channel: 'Instagram Ads', leads: 245, bookings: 184, revenue: 285000,
    spend: 42000, roi: 578, cpa: 228, color: '#E1306C',
    trend: [12, 18, 22, 26, 31, 35],
  },
  {
    channel: 'Facebook Ads', leads: 198, bookings: 142, revenue: 218000,
    spend: 38000, roi: 474, cpa: 268, color: '#1877F2',
    trend: [10, 14, 18, 22, 26, 28],
  },
  {
    channel: 'Google Ads', leads: 312, bookings: 198, revenue: 324000,
    spend: 55000, roi: 489, cpa: 278, color: '#4285F4',
    trend: [18, 22, 28, 32, 38, 42],
  },
  {
    channel: 'Referral', leads: 156, bookings: 128, revenue: 195000,
    spend: 8000, roi: 2337, cpa: 62, color: '#10B981',
    trend: [8, 12, 16, 18, 22, 26],
  },
  {
    channel: 'WhatsApp', leads: 98, bookings: 67, revenue: 98000,
    spend: 5000, roi: 1860, cpa: 74, color: '#25D366',
    trend: [5, 8, 10, 12, 14, 16],
  },
  {
    channel: 'Influencer', leads: 72, bookings: 42, revenue: 68000,
    spend: 25000, roi: 172, cpa: 595, color: '#F59E0B',
    trend: [4, 6, 7, 8, 9, 10],
  },
];

export const inventoryData = {
  lowStock: [
    { name: 'L\'Oreal Color Cream - Dark Brown', sku: 'LC-DB-001', stock: 3, minStock: 10, unit: 'tubes', category: 'Color' },
    { name: 'Wella EIMI Mousse', sku: 'WE-M-042', stock: 2, minStock: 8, unit: 'bottles', category: 'Styling' },
    { name: 'Kerastase Nutritive Shampoo 250ml', sku: 'KS-N-008', stock: 4, minStock: 12, unit: 'bottles', category: 'Care' },
    { name: 'Matrix Biolage Conditioner', sku: 'MB-C-015', stock: 5, minStock: 15, unit: 'bottles', category: 'Care' },
    { name: 'OPI Nail Color - Red', sku: 'OPI-R-022', stock: 1, minStock: 6, unit: 'bottles', category: 'Nails' },
  ],
  expiring: [
    { name: 'Schwarzkopf Blondme', sku: 'SK-B-009', expiry: '2026-07-15', stock: 8, category: 'Color' },
    { name: 'Wella Koleston Cream', sku: 'WK-C-034', expiry: '2026-07-28', stock: 12, category: 'Color' },
    { name: 'Aloe Vera Gel 500ml', sku: 'AV-G-011', expiry: '2026-08-05', stock: 6, category: 'Skin' },
  ],
  fastMoving: [
    { name: 'Haircut Disposables', sku: 'HD-001', soldThisMonth: 284, revenue: 0, category: 'Consumables' },
    { name: 'L\'Oreal Conditioner 200ml', sku: 'LC-CD-002', soldThisMonth: 68, revenue: 27200, category: 'Care' },
    { name: 'Matrix Total Results Shampoo', sku: 'MT-S-018', soldThisMonth: 52, revenue: 20800, category: 'Care' },
    { name: 'OPI Base Coat', sku: 'OPI-BC-001', soldThisMonth: 45, revenue: 13500, category: 'Nails' },
    { name: 'Wella Oil Reflections', sku: 'WO-R-005', soldThisMonth: 38, revenue: 30400, category: 'Care' },
  ],
  deadStock: [
    { name: 'Crimping Iron Pro', sku: 'CI-P-003', stock: 2, lastSold: '45 days ago', value: 3200, category: 'Tools' },
    { name: 'Scalp Treatment Kit', sku: 'ST-K-007', stock: 4, lastSold: '62 days ago', value: 8000, category: 'Care' },
    { name: 'Vintage Curl Cream', sku: 'VC-C-001', stock: 7, lastSold: '91 days ago', value: 5600, category: 'Styling' },
  ],
};

export const adminActivityLog = [
  { id: 1, user: 'Priya Admin', role: 'Admin', action: 'Created Bill', detail: 'Bill #INV-2847 for ₹4,250', date: '2026-06-04', time: '18:42:15', ip: '192.168.1.42', type: 'billing' },
  { id: 2, user: 'Rahul Manager', role: 'Manager', action: 'Updated Appointment', detail: 'Appt #A-1284 rescheduled to Jun 8', date: '2026-06-04', time: '17:28:33', ip: '192.168.1.18', type: 'appointment' },
  { id: 3, user: 'Priya Admin', role: 'Admin', action: 'Added Membership', detail: 'Gold plan for Meghna Reddy', date: '2026-06-04', time: '16:55:10', ip: '192.168.1.42', type: 'membership' },
  { id: 4, user: 'Ankit Staff', role: 'Staff', action: 'Staff Check-in', detail: 'Check-in at 09:05 AM', date: '2026-06-04', time: '09:05:22', ip: '192.168.1.55', type: 'staff' },
  { id: 5, user: 'Priya Admin', role: 'Admin', action: 'Updated Service Price', detail: 'Keratin: ₹3500 → ₹4000', date: '2026-06-03', time: '19:12:04', ip: '192.168.1.42', type: 'service' },
  { id: 6, user: 'Rahul Manager', role: 'Manager', action: 'Refunded Bill', detail: 'Bill #INV-2831 refunded ₹1,800', date: '2026-06-03', time: '15:44:18', ip: '192.168.1.18', type: 'billing' },
  { id: 7, user: 'Priya Admin', role: 'Admin', action: 'Added Staff', detail: 'New staff: Kiran Sharma (Stylist)', date: '2026-06-02', time: '11:30:45', ip: '192.168.1.42', type: 'staff' },
  { id: 8, user: 'Priya Admin', role: 'Admin', action: 'Edited Bill', detail: 'Bill #INV-2820 modified by ₹250', date: '2026-06-02', time: '10:15:32', ip: '192.168.1.42', type: 'billing' },
  { id: 9, user: 'Rahul Manager', role: 'Manager', action: 'Deleted Appointment', detail: 'Cancelled Appt #A-1279 (No-show)', date: '2026-06-01', time: '20:02:58', ip: '192.168.1.18', type: 'appointment' },
  { id: 10, user: 'Priya Admin', role: 'Admin', action: 'Deleted Staff', detail: 'Removed staff: Vikash Kumar', date: '2026-05-31', time: '18:45:11', ip: '192.168.1.42', type: 'staff' },
];

export const multiBranchData = [
  {
    branch: 'Kondapur', city: 'Hyderabad', revenue: 847500, growth: 11.2,
    clients: 1284, staff: 8, rating: 4.8, retention: 78.4,
    monthlyRevenue: [612000, 698000, 743000, 715000, 762000, 847500],
  },
  {
    branch: 'Banjara Hills', city: 'Hyderabad', revenue: 748200, growth: 8.4,
    clients: 1142, staff: 7, rating: 4.7, retention: 75.2,
    monthlyRevenue: [558000, 614000, 658000, 634000, 690000, 748200],
  },
  {
    branch: 'Jubilee Hills', city: 'Hyderabad', revenue: 682000, growth: 15.1,
    clients: 986, staff: 6, rating: 4.9, retention: 81.6,
    monthlyRevenue: [428000, 498000, 545000, 524000, 593000, 682000],
  },
  {
    branch: 'Gachibowli', city: 'Hyderabad', revenue: 524500, growth: 6.8,
    clients: 784, staff: 5, rating: 4.6, retention: 72.8,
    monthlyRevenue: [398000, 432000, 465000, 448000, 491000, 524500],
  },
];

export const aiInsights = [
  { id: 1, icon: '📈', type: 'growth', message: 'Hair Color revenue increased by 22.1% this month — highest growth service', action: 'View Service Analytics' },
  { id: 2, icon: '🏆', type: 'performance', message: 'Rahul Sharma generated highest revenue this month: ₹2,45,000', action: 'View Staff Report' },
  { id: 3, icon: '🔔', type: 'alert', message: '58 membership renewals expected next week — send reminder campaigns', action: 'View Memberships' },
  { id: 4, icon: '📅', type: 'insight', message: 'Saturday is your highest booking day with 248 appointments on average', action: 'View Appointments' },
  { id: 5, icon: '⚠️', type: 'warning', message: 'Client retention rate dropped 1.5% from last month — review lost clients', action: 'View Client Analytics' },
  { id: 6, icon: '💡', type: 'opportunity', message: 'Google Ads shows highest ROI at 489% — consider increasing ad spend', action: 'View Marketing' },
  { id: 7, icon: '📦', type: 'inventory', message: '5 products below minimum stock level — reorder required immediately', action: 'View Inventory' },
  { id: 8, icon: '⭐', type: 'performance', message: 'Sonal Agarwal has 76% repeat client rate — feature her for memberships upsell', action: 'View Staff Report' },
];

export const notifications = [
  { id: 1, type: 'appointment', icon: '📅', title: 'New Appointment', message: 'Priya Sharma booked Haircut + Color at 3:30 PM', time: '2 min ago', read: false },
  { id: 2, type: 'client', icon: '👤', title: 'New Client Registration', message: 'Kavya Reddy registered via Instagram', time: '8 min ago', read: false },
  { id: 3, type: 'membership', icon: '👑', title: 'Membership Expiring', message: 'Meghna Reddy\'s Platinum membership expires in 3 days', time: '15 min ago', read: false },
  { id: 4, type: 'stock', icon: '📦', title: 'Low Stock Alert', message: 'L\'Oreal Color Cream (Dark Brown) — only 3 left', time: '42 min ago', read: true },
  { id: 5, type: 'staff', icon: '✅', title: 'Staff Check-in', message: 'Rahul Sharma checked in at 9:05 AM', time: '2 hr ago', read: true },
  { id: 6, type: 'billing', icon: '💰', title: 'High Value Bill', message: 'Bill #INV-2847 generated for ₹18,500 by Priya Admin', time: '3 hr ago', read: true },
];

export const todaySchedule = [
  { time: '09:30', client: 'Anjali Verma', service: 'Hair Color + Highlights', staff: 'Priya Kapoor', duration: 90, status: 'completed' },
  { time: '10:00', client: 'Meena Sharma', service: 'Haircut + Blowdry', staff: 'Rahul Sharma', duration: 60, status: 'completed' },
  { time: '11:00', client: 'Walk-in', service: 'Beard Styling', staff: 'Ankit Mehta', duration: 30, status: 'completed' },
  { time: '12:30', client: 'Sunita Rao', service: 'Keratin Treatment', staff: 'Priya Kapoor', duration: 120, status: 'in-progress' },
  { time: '02:00', client: 'Divya Kumar', service: 'Facial + Eyebrows', staff: 'Sonal Agarwal', duration: 75, status: 'confirmed' },
  { time: '03:30', client: 'Priya Sharma', service: 'Haircut + Color', staff: 'Rahul Sharma', duration: 90, status: 'confirmed' },
  { time: '04:00', client: 'Ritu Gupta', service: 'Manicure + Pedicure', staff: 'Sonal Agarwal', duration: 60, status: 'confirmed' },
  { time: '05:30', client: 'Walk-in', service: 'Haircut', staff: 'Vikram Nair', duration: 45, status: 'pending' },
  { time: '06:00', client: 'Kavya Nair', service: 'Hair Spa', staff: 'Rahul Sharma', duration: 60, status: 'pending' },
];
