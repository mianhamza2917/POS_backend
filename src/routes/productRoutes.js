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
const validate = require('../middleware/validateMiddleware');
const { createProductValidator, updateProductValidator, updateStockValidator } = require('../validators/productValidators');

const staffRoles = authorize('admin', 'manager', 'cashier');
const mgmtRoles = authorize('admin', 'manager');

// Product routes accessible by Admin, Manager, and Cashier (read-only for Cashier)
router
  .route('/')
  .get(protect, staffRoles, getProducts)
  .post(protect, mgmtRoles, createProductValidator, validate, createProduct); // Cashiers CANNOT create products

router
  .route('/:id')
  .get(protect, staffRoles, getProductById)
  .put(protect, mgmtRoles, updateProductValidator, validate, updateProduct) // Cashiers CANNOT update products
  .delete(protect, mgmtRoles, deleteProduct); // Cashiers CANNOT delete products

router.patch('/:id/stock', protect, mgmtRoles, updateStockValidator, validate, updateStock); // Cashiers CANNOT manage stock

module.exports = router;
