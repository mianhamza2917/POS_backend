const User = require('../models/User');
const { deleteFile } = require('../middleware/uploadMiddleware');

// @desc    Get logged-in user profile
// @route   GET /api/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        errors: ['User not found'],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        photo: user.photo,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update logged-in user profile
// @route   PUT /api/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        errors: ['User not found'],
      });
    }

    const { name, phone, address } = req.body;

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        photo: user.photo,
        role: user.role,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload profile photo
// @route   PUT /api/profile/photo
// @access  Private
const uploadProfilePhoto = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        errors: ['User not found'],
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        errors: ['Please select an image file to upload'],
      });
    }

    // Delete old photo if exists
    if (user.photo) {
      deleteFile(user.photo);
    }

    // Save relative path
    const relativePath = `uploads/profiles/${req.file.filename}`;
    user.photo = relativePath;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully',
      data: {
        photo: user.photo,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password (logged-in user)
// @route   PUT /api/profile/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        errors: ['User not found'],
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
        errors: ['Current password and new password are required'],
      });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
        errors: ['Current password is incorrect'],
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  changePassword,
};

