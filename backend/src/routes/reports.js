const express = require('express');
const router = express.Router();
const { reportsController: ctrl, analyticsController: analytics } = require('../controllers/combined');
const { adminOnly } = require('../middleware/auth');

router.get('/dashboard', ...adminOnly, ctrl.dashboard);
router.get('/revenue', ...adminOnly, ctrl.revenue);
router.get('/daily', ...adminOnly, ctrl.daily);
router.get('/export', ...adminOnly, ctrl.export);

// Analytics endpoints
router.get('/analytics/staff', ...adminOnly, analytics.staffPerformance);
router.get('/analytics/staff/:id', ...adminOnly, analytics.staffDetail);
router.get('/analytics/services', ...adminOnly, analytics.serviceAnalytics);
router.get('/analytics/appointments', ...adminOnly, analytics.appointmentAnalytics);
router.get('/analytics/billing', ...adminOnly, analytics.billingAnalytics);
router.get('/analytics/memberships', ...adminOnly, analytics.membershipAnalytics);
router.get('/analytics/marketing', ...adminOnly, analytics.marketingAnalytics);

module.exports = router;
