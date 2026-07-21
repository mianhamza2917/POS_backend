const express = require('express');
const router = express.Router();
const {
  getSalesReport,
  getRevenueReport,
  getCategoryReport,
  getTopProductsReport,
  getCustomerReport,
  getPaymentMethodReport,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

const managerUp = authorize('admin', 'manager');

router.get('/sales', protect, managerUp, getSalesReport);
router.get('/revenue', protect, managerUp, getRevenueReport);
router.get('/categories', protect, managerUp, getCategoryReport);
router.get('/top-products', protect, managerUp, getTopProductsReport);
router.get('/customers', protect, managerUp, getCustomerReport);
router.get('/payment-methods', protect, managerUp, getPaymentMethodReport);

module.exports = router;
