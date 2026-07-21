const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

const staffRoles = authorize('admin', 'manager', 'cashier');

// Product routes accessible by Admin, Manager, and Cashier
router
  .route('/')
  .get(protect, staffRoles, getProducts)
  .post(protect, staffRoles, createProduct);

router
  .route('/:id')
  .get(protect, staffRoles, getProductById)
  .put(protect, staffRoles, updateProduct)
  .delete(protect, staffRoles, deleteProduct);

router.patch('/:id/stock', protect, staffRoles, updateStock);

module.exports = router;
