const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      const message = 'User already exists with this email';
      return res.status(400).json({
        success: false,
        message,
        errors: [message],
      });
    }

    // Create new user (password will be hashed by pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
    });

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      errors: [error.message],
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists (include password for comparison)
    const user = await User.findOne({ email }).select('+password');

    if (!user || user.isDeleted) {
      const message = 'Invalid email or password';
      return res.status(401).json({
        success: false,
        message,
        errors: [message],
      });
    }

    // Check if password matches
    const isPasswordMatch = await user.matchPassword(password);

    if (!isPasswordMatch) {
      const message = 'Invalid email or password';
      return res.status(401).json({
        success: false,
        message,
        errors: [message],
      });
    }

    if (user.isDisabled) {
      const message = 'Account is disabled. Please contact administrator.';
      return res.status(403).json({
        success: false,
        message,
        errors: [message],
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      errors: [error.message],
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    // req.user is set by authMiddleware
    const user = await User.findById(req.user._id);

    if (!user || user.isDeleted) {
      const message = 'User not found';
      return res.status(404).json({
        success: false,
        message,
        errors: [message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile',
      errors: [error.message],
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "No user found with this email",
        errors: ["No user found with this email"],
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Save hashed token in DB
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Token expires in 30 minutes
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/auth/resetpassword/${resetToken}`;

    // DEVELOPMENT MODE
    // Instead of sending email, return the token in the response.
    return res.status(200).json({
      success: true,
      message: "Password reset token generated successfully",
      data: {
        resetToken,
        resetUrl,
        expiresIn: "30 minutes",
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while generating reset token",
      errors: [error.message],
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
const resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    // Find user by token and check if token is not expired
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user || user.isDeleted) {
      const message = 'Invalid or expired reset token';
      return res.status(400).json({
        success: false,
        message,
        errors: [message],
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Generate new JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during password reset',
      errors: [error.message],
    });
  }
};

// @desc    Change password (logged-in user)
// @route   PUT /api/auth/changepassword
// @access  Private
const changePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user || user.isDeleted) {
      return res.status(404).json({ success: false, message: 'User not found', errors: ['User not found'] });
    }

    const isMatch = await user.matchPassword(req.body.currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect', errors: ['Current password is incorrect'] });
    }

    user.password = req.body.newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully', data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error while changing password', errors: [error.message] });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  forgotPassword,
  resetPassword,
  changePassword,
};
