const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/staff');
const { authenticate, adminOnly } = require('../middleware/auth');
const { uploadStaff } = require('../middleware/upload');

router.get('/', ctrl.getAllStaff);
router.get('/:id', ctrl.getStaffById);
router.get('/:id/analytics', ...adminOnly, ctrl.getStaffAnalytics);
router.post('/', ...adminOnly, uploadStaff.single('photo'), ctrl.createStaff);
router.put('/:id', ...adminOnly, uploadStaff.single('photo'), ctrl.updateStaff);
router.delete('/:id', ...adminOnly, ctrl.deleteStaff);
router.post('/reviews', authenticate, ctrl.addReview);

module.exports = router;
