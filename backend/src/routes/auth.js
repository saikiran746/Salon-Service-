// routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login, adminLogin, adminMagicLogin, getMe, forgotPassword, resetPassword, refreshToken, changePassword, setPassword, getAdminLogins, googleLogin } = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/admin/login', adminLogin);
// One-time magic link — no auth required; token IS the credential
router.get('/admin/magic-login', adminMagicLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);
router.put('/set-password', authenticate, setPassword);
router.get('/admin/activity', authenticate, getAdminLogins);

module.exports = router;
