const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token (exclude password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user || req.user.isDeleted) {
        return res.status(401).json({
          success: false,
          message: 'User not found or account removed',
          errors: ['User not found or account removed'],
        });
      }

      if (req.user.isDisabled) {
        return res.status(403).json({
          success: false,
          message: 'Account is disabled. Please contact administrator.',
          errors: ['Account is disabled. Please contact administrator.'],
        });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed',
        errors: ['Not authorized, token failed'],
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token',
      errors: ['Not authorized, no token'],
    });
  }
};

// Admin middleware (retained for backward compatibility)
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
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
      return res.status(403).json({
        success: false,
        message,
        errors: [message],
      });
    }
    next();
  };
};

module.exports = { protect, admin, authorize };
