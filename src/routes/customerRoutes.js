const express = require('express');
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
const { createCustomerValidator, updateCustomerValidator } = require('../validators/customerValidators');

const staffRoles = authorize('admin', 'manager', 'cashier');

// Customer Management Routes
router
  .route('/')
  .get(protect, staffRoles, getCustomers)
  .post(protect, staffRoles, createCustomerValidator, validate, createCustomer);

router
  .route('/:id')
  .get(protect, staffRoles, getCustomerById)
  .put(protect, staffRoles, updateCustomerValidator, validate, updateCustomer)
  .delete(protect, authorize('admin', 'manager'), deleteCustomer); // Cashiers CANNOT delete customers

module.exports = router;
