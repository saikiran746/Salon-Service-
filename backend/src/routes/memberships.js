const express = require('express');
const router = express.Router();
const { membershipController: ctrl } = require('../controllers/combined');
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/', ctrl.getAll);
router.get('/admin/all', ...adminOnly, ctrl.getAllAdmin);
router.get('/admin/members', ...adminOnly, ctrl.getMembers);
router.post('/purchase', authenticate, ctrl.purchase);
router.post('/', ...adminOnly, ctrl.create);
router.put('/:id', ...adminOnly, ctrl.update);
router.delete('/:id', ...adminOnly, ctrl.delete);

module.exports = router;
