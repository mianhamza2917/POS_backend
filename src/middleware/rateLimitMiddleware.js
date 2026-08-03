const rateLimit = require('express-rate-limit');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Auth Rate Limiter
 * Limits authentication attempts to 10 requests per 15 minutes per IP.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    errors: ['Too many authentication attempts. Please try again after 15 minutes.'],
  },
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS || 429,
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * General API Rate Limiter
 * Limits general requests to 100 per minute per IP.
 */
const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
    errors: ['Too many requests. Please slow down.'],
  },
  statusCode: 429,
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = {
  authRateLimiter,
  apiRateLimiter,
};
