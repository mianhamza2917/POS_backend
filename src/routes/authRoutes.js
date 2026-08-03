const express = require('express');
const { registerUser, loginUser, getUserProfile, forgotPassword, resetPassword, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { authRateLimiter } = require('../middleware/rateLimitMiddleware');
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
} = require('../validators/authValidators');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authRateLimiter, registerValidator, validate, registerUser);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authRateLimiter, loginValidator, validate, loginUser);

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, getUserProfile);

// @route   POST /api/auth/forgotpassword
// @desc    Forgot password
// @access  Public
router.post('/forgotpassword', authRateLimiter, forgotPasswordValidator, validate, forgotPassword);

// @route   PUT /api/auth/resetpassword/:resettoken
// @desc    Reset password
// @access  Public
router.put('/resetpassword/:resettoken', resetPasswordValidator, validate, resetPassword);

// @route   PUT /api/auth/changepassword
// @desc    Change password
// @access  Private
router.put('/changepassword', protect, changePasswordValidator, validate, changePassword);

module.exports = router;
