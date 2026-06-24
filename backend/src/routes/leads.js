const express = require('express');
const router = express.Router();
const { leadsController: ctrl } = require('../controllers/combined');
const { adminOnly } = require('../middleware/auth');

router.post('/capture', ctrl.capture);
router.get('/', ...adminOnly, ctrl.getAll);
router.patch('/:id', ...adminOnly, ctrl.updateStatus);

module.exports = router;
