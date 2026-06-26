require('dotenv').config();
const { testConnection } = require('./config/database');

const PORT = process.env.PORT || 5000;

async function startServer() {
  await testConnection();

  // Load the app, cron jobs, and WhatsApp client after database connection is fully established
  const app = require('./app');
  const { startCronJobs } = require('./services/cronService');
  app.listen(PORT, '0.0.0.0', () => {
    const isProd = process.env.NODE_ENV === 'production';
    const baseUrl = isProd 
      ? (process.env.BACKEND_URL || process.env.API_BASE_URL || `https://salon-service-production-d310.up.railway.app`)
      : `http://localhost:${PORT}`;

    console.log(`🚀 Salon Management Server running on port ${PORT}`);
    console.log(`📌 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 API Base URL: ${baseUrl}/api`);
  });

  startCronJobs();
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
