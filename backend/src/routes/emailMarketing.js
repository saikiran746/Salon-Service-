const express = require('express');
const router = express.Router();
const { emailMarketingController: ctrl } = require('../controllers/combined');
const { adminOnly } = require('../middleware/auth');

router.get('/templates', ...adminOnly, ctrl.getTemplates);
router.post('/templates', ...adminOnly, ctrl.createTemplate);
router.put('/templates/:id', ...adminOnly, ctrl.updateTemplate);
router.post('/send', ...adminOnly, ctrl.sendCampaign);
router.get('/campaigns', ...adminOnly, ctrl.getCampaigns);

module.exports = router;
