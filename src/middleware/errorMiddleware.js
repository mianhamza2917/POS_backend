const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error(err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => error.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `${field} already exists`;
    return res.status(400).json({
      success: false,
      message,
      errors: [message],
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    const message = 'Resource not found / Invalid ID format';
    return res.status(400).json({
      success: false,
      message,
      errors: [message],
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    return res.status(401).json({
      success: false,
      message,
      errors: [message],
    });
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    return res.status(401).json({
      success: false,
      message,
      errors: [message],
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    errors: [message],
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;
