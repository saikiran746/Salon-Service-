const http = require('http');

const endpoints = [
  '/api/customers',
  '/api/billing',
  '/api/appointments',
  '/api/notifications',
  '/api/dashboard/stats'
];

async function verify() {
  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:5000${ep}`);
      const text = await res.text();
      console.log(`[${res.status}] ${ep}: ${text.substring(0, 100)}...`);
    } catch (e) {
      console.error(`Failed to fetch ${ep}:`, e.message);
    }
  }
}

verify();
