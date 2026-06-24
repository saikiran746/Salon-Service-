const express = require('express');
const router = express.Router();
const { galleryController: ctrl } = require('../controllers/combined');
const { adminOnly } = require('../middleware/auth');
const { uploadGallery } = require('../middleware/upload');

router.get('/', ctrl.getAll);
router.get('/admin/all', ...adminOnly, ctrl.getAllAdmin);
router.post('/', ...adminOnly, uploadGallery.single('media'), ctrl.create);
router.put('/:id', ...adminOnly, ctrl.update);
router.delete('/:id', ...adminOnly, ctrl.delete);

module.exports = router;
