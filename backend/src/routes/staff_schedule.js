const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/staff_schedule');
const { authenticate, adminOnly } = require('../middleware/auth');

// Shifts
router.get('/shifts', authenticate, ctrl.getShifts);
router.post('/shifts', ...adminOnly, ctrl.assignShift);
router.delete('/shifts/:id', ...adminOnly, ctrl.deleteShift);

// Available staff for a given date (public - used in client booking)
router.get('/available-staff', ctrl.getAvailableStaff);

// Leaves
router.get('/leaves', authenticate, ctrl.getLeaves);
router.post('/leaves', authenticate, ctrl.requestLeave);
router.put('/leaves/:id/status', ...adminOnly, ctrl.updateLeaveStatus);

// Attendance
router.get('/attendance', ...adminOnly, ctrl.getAttendance);

// Analytics
router.get('/analytics', ...adminOnly, ctrl.getStaffAnalytics);

module.exports = router;

