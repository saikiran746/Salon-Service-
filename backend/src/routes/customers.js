const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/customers');
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/stats', ...adminOnly, ctrl.getCustomerStats);
router.get('/new-vs-old-chart', ...adminOnly, ctrl.getCustomerChartData);
router.get('/booking-sources-chart', ...adminOnly, ctrl.getBookingSourcesChartData);
router.get('/membership-growth-chart', ...adminOnly, ctrl.getMembershipGrowthChart);
router.get('/me', authenticate, ctrl.getMyProfile);
router.put('/me', authenticate, ctrl.updateMyProfile);
router.get('/', ...adminOnly, ctrl.getAllCustomers);
router.get('/:id', ...adminOnly, ctrl.getCustomerById);
router.put('/:id', ...adminOnly, ctrl.updateCustomer);
router.delete('/:id', ...adminOnly, ctrl.deleteCustomer);

module.exports = router;
