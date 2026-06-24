const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/appointments');
const { authenticate, adminOnly, optionalAuth } = require('../middleware/auth');

router.get('/available-slots', ctrl.getAvailableSlots);
router.get('/smart-recommendations', ctrl.getSmartRecommendations);
router.get('/today', ...adminOnly, ctrl.getTodayAppointments);
router.get('/my', authenticate, ctrl.getMyAppointments);
router.get('/', ...adminOnly, ctrl.getAllAppointments);
router.get('/:id', authenticate, ctrl.getAppointmentById);
router.post('/', optionalAuth, ctrl.createAppointment);
router.put('/:id', ...adminOnly, ctrl.updateAppointment);
router.patch('/:id/cancel', authenticate, ctrl.cancelAppointment);

module.exports = router;
