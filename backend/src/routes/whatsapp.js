const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/whatsapp');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/settings', authenticate, getSettings);
router.put('/settings', authenticate, authorize('admin', 'super_admin'), updateSettings);

module.exports = router;
