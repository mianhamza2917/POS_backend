const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

// Customer Management Routes
router
  .route('/')
  .get(protect, authorize('admin', 'manager', 'cashier'), getCustomers)
  .post(
    protect,
    authorize('admin', 'manager', 'cashier'),
    [
      body('name').trim().notEmpty().withMessage('Customer name is required'),
      body('phone').trim().notEmpty().withMessage('Phone number is required'),
    ],
    validate,
    createCustomer
  );

router
  .route('/:id')
  .get(protect, authorize('admin', 'manager', 'cashier'), getCustomerById)
  .put(protect, authorize('admin', 'manager', 'cashier'), updateCustomer)
  .delete(protect, authorize('admin', 'manager'), deleteCustomer); // Cashiers CANNOT delete customers

module.exports = router;
