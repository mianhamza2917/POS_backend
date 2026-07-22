const { body } = require('express-validator');

const createCustomerValidator = [
  body('name').trim().notEmpty().withMessage('Customer name is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
];

const updateCustomerValidator = [
  body('name').optional().trim().notEmpty().withMessage('Customer name cannot be empty'),
  body('phone').optional().trim().notEmpty().withMessage('Phone number cannot be empty'),
  body('email').optional().trim().isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
  body('address').optional().trim(),
];

module.exports = {
  createCustomerValidator,
  updateCustomerValidator,
};
