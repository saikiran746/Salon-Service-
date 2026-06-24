const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/services');
const { adminOnly } = require('../middleware/auth');
const { uploadService } = require('../middleware/upload');

router.get('/', ctrl.getAllServices);
router.get('/:id', ctrl.getServiceById);
router.get('/:id/staff', ctrl.getServiceStaff);
router.post('/', ...adminOnly, uploadService.single('image'), ctrl.createService);
router.put('/bulk-category', ...adminOnly, ctrl.updateBulkCategory);
router.put('/:id', ...adminOnly, uploadService.single('image'), ctrl.updateService);
router.delete('/:id', ...adminOnly, ctrl.deleteService);

module.exports = router;
