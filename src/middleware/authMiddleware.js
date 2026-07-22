const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { USER_ROLES, ERROR_MSGS, HTTP_STATUS } = require('../utils/constants');

const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token (exclude password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user || req.user.isDeleted) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: ERROR_MSGS.USER_NOT_FOUND,
          errors: [ERROR_MSGS.USER_NOT_FOUND],
        });
      }

      if (req.user.isDisabled) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: ERROR_MSGS.ACCOUNT_DISABLED,
          errors: [ERROR_MSGS.ACCOUNT_DISABLED],
        });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Not authorized, token failed',
        errors: ['Not authorized, token failed'],
      });
    }
  }

  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Not authorized, no token',
      errors: ['Not authorized, no token'],
    });
  }
};

// Admin middleware (retained for backward compatibility)
const admin = (req, res, next) => {
  if (req.user && req.user.role === USER_ROLES.ADMIN) {
    next();
  } else {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Not authorized as an admin',
      errors: ['Not authorized as an admin'],
    });
  }
};

// Generic role authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const message = `User role '${req.user ? req.user.role : 'none'}' is not authorized to access this route`;
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message,
        errors: [message],
      });
    }
    next();
  };
};

module.exports = { protect, admin, authorize };
