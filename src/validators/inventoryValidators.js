const { body } = require('express-validator');

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

const inventoryQueryValidator = [
  body('threshold')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Threshold must be a positive integer'),
];

module.exports = {
  adjustStockValidator,
  inventoryQueryValidator,
};
