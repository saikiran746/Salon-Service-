require('dotenv').config();
const { testConnection } = require('./config/database');

const PORT = process.env.PORT || 5000;

async function startServer() {
  await testConnection();

  // Load the app, cron jobs, and WhatsApp client after database connection is fully established
  const app = require('./app');
  const { startCronJobs } = require('./services/cronService');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Salon Management Server running on port ${PORT}`);
    console.log(`📌 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
  });

  startCronJobs();
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
