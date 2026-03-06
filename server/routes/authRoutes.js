const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile
} = require('../controllers/authController');
const { validateRegister, validateLogin, validateSendOtp, validateVerifyOtpRegister } = require('../validations/authValidation');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', validateRegister, register); // Keeping for fallback/admin
router.post('/send-otp', validateSendOtp, sendOtp);
router.post('/verify-otp-register', validateVerifyOtpRegister, verifyOtpAndRegister);
router.post('/login', validateLogin, login);

// Protected routes
router.get('/me', protect, getMe);

// Token validation endpoint for desktop app
router.get('/verify', protect, (req, res) => {
  res.json({
    success: true,
    email: req.user.email,
    role: req.user.accountType
  });
});

module.exports = router;

