const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/billing');
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/my', authenticate, ctrl.getMyBills);
router.get('/', ...adminOnly, ctrl.getAllBills);
router.post('/', ...adminOnly, ctrl.createBill);
router.get('/:id', authenticate, ctrl.getBillById);
router.get('/:id/download', ctrl.downloadInvoice);
router.get('/:id/pdf', ctrl.viewInvoice);
router.delete('/:id', ...adminOnly, ctrl.deleteBill);

module.exports = router;
