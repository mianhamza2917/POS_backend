const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createCategoryValidator, updateCategoryValidator } = require('../validators/categoryValidators');

const staffRoles = authorize('admin', 'manager', 'cashier');
const mgmtRoles = authorize('admin', 'manager');

// Category routes accessible by Admin, Manager, and Cashier (read-only for Cashier)
router
  .route('/')
  .get(protect, staffRoles, getCategories)
  .post(protect, mgmtRoles, createCategoryValidator, validate, createCategory); // Cashiers CANNOT create categories

router
  .route('/:id')
  .get(protect, staffRoles, getCategoryById)
  .put(protect, mgmtRoles, updateCategoryValidator, validate, updateCategory) // Cashiers CANNOT update categories
  .delete(protect, mgmtRoles, deleteCategory); // Cashiers CANNOT delete categories

module.exports = router;
