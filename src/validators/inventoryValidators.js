const { body, param } = require('express-validator');

const adjustStockValidator = [
  body('adjustment')
    .notEmpty()
    .withMessage('Adjustment is required')
    .isInt({ allow_leading_zero: false })
    .withMessage('Adjustment must be an integer')
    .custom((value) => {
      if (value === 0) {
        throw new Error('Adjustment cannot be zero');
      }
      return true;
    }),
  body('reason')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason cannot be more than 200 characters'),
];

const createInventoryValidator = [
  body('product')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  body('lowStockThreshold')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Low stock threshold must be at least 1'),
  body('location')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot be more than 100 characters'),
];

const inventoryQueryValidator = [
  body('threshold')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Threshold must be a positive integer'),
];

module.exports = {
  adjustStockValidator,
  createInventoryValidator,
  inventoryQueryValidator,
};
