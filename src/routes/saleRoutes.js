const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { createSale, getSales, getSaleById, deleteSale } = require('../controllers/saleController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const staffRoles = authorize('admin', 'manager', 'cashier');

router
  .route('/')
  .get(protect, staffRoles, getSales)
  .post(
    protect,
    staffRoles,
    [
      body('items').isArray({ min: 1 }).withMessage('Sale must have at least one item'),
      body('items.*.product').notEmpty().withMessage('Each item must have a product ID'),
      body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
      body('discountAmount').optional().isFloat({ min: 0 }).withMessage('Discount cannot be negative'),
      body('taxAmount').optional().isFloat({ min: 0 }).withMessage('Tax cannot be negative'),
      body('paymentMethod').optional().isIn(['cash', 'card', 'online', 'other']).withMessage('Invalid payment method'),
    ],
    validate,
    createSale
  );

router
  .route('/:id')
  .get(protect, staffRoles, getSaleById)
  .delete(protect, authorize('admin'), deleteSale);

module.exports = router;
