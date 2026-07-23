const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  changePassword,
} = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');
const { handleProfileUpload } = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validateMiddleware');
const { updateProfileValidator, changePasswordValidator } = require('../validators/profileValidators');

// GET /api/profile - Get logged-in user profile
router.get('/', protect, getProfile);

// PUT /api/profile - Update profile (name, phone, address)
router.put('/', protect, updateProfileValidator, validate, updateProfile);

// PUT /api/profile/photo - Upload profile image
router.put('/photo', protect, handleProfileUpload, uploadProfilePhoto);

// PUT /api/profile/change-password - Change password
router.put('/change-password', protect, changePasswordValidator, validate, changePassword);

module.exports = router;

