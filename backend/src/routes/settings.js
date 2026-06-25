const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, changeAdminCredentials, requestEmailOtp, verifyEmailOtp, requestCredChangeOtp } = require('../controllers/settings');
const { authenticate, authorize } = require('../middleware/auth');

// Public route to fetch settings (needed for frontend — slot_interval, working_hours etc.)
router.get('/', getSettings);

// Admin only route to update general site settings
router.put('/', authenticate, authorize('admin', 'super_admin'), updateSettings);

// Super admin only — change admin login credentials (email / password)
// Sends admin panel notification + optional security alert to secondary_alert_email
router.post('/change-credentials', authenticate, authorize('admin', 'super_admin'), changeAdminCredentials);

router.post('/request-email-otp', authenticate, authorize('admin', 'super_admin'), requestEmailOtp);
router.post('/verify-email-otp', authenticate, authorize('admin', 'super_admin'), verifyEmailOtp);
router.post('/request-cred-otp', authenticate, authorize('admin', 'super_admin'), requestCredChangeOtp);

module.exports = router;
