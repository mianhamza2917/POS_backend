const { body } = require('express-validator');

const createSaleValidator = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Sale must have at least one item'),
  body('items.*.product')
    .notEmpty()
    .withMessage('Each item must have a product ID')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('items.*.unitPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit price cannot be negative'),
  body('items.*.discount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Item discount cannot be negative'),
  body('customer')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage('Invalid customer ID'),
  body('discountAmount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Discount cannot be negative'),
  body('taxAmount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Tax cannot be negative'),
  body('amountPaid')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Amount paid cannot be negative'),
  body('changeAmount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Change amount cannot be negative'),
  body('paymentMethod')
    .optional({ nullable: true })
    .isIn(['cash', 'card', 'online', 'other'])
    .withMessage('Invalid payment method'),
  body('notes')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot be more than 500 characters'),
];

const updateSaleValidator = [
  body('customer')
    .optional()
    .isMongoId()
    .withMessage('Invalid customer ID'),
  body('discountAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount cannot be negative'),
  body('taxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tax cannot be negative'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'online', 'other'])
    .withMessage('Invalid payment method'),
  body('paymentStatus')
    .optional()
    .isIn(['paid', 'pending', 'refunded'])
    .withMessage('Invalid payment status'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot be more than 500 characters'),
];

module.exports = {
  createSaleValidator,
  updateSaleValidator,
};
