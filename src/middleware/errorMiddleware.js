const { ERROR_MSGS, HTTP_STATUS } = require('../utils/constants');

const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error(err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => error.message);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: ERROR_MSGS.VALIDATION_FAILED,
      errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: ERROR_MSGS.DUPLICATE_FIELD(field),
      errors: [ERROR_MSGS.DUPLICATE_FIELD(field)],
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: ERROR_MSGS.INVALID_ID,
      errors: [ERROR_MSGS.INVALID_ID],
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: ERROR_MSGS.INVALID_TOKEN,
      errors: [ERROR_MSGS.INVALID_TOKEN],
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: ERROR_MSGS.EXPIRED_TOKEN,
      errors: [ERROR_MSGS.EXPIRED_TOKEN],
    });
  }

  // Default error
  const statusCode = err.statusCode || HTTP_STATUS.SERVER_ERROR;
  const message = err.message || ERROR_MSGS.SERVER_ERROR;

  res.status(statusCode).json({
    success: false,
    message,
    errors: [message],
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;
