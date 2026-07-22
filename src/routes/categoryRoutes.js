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

// Category routes accessible by Admin, Manager, and Cashier
router
  .route('/')
  .get(protect, staffRoles, getCategories)
  .post(protect, staffRoles, createCategoryValidator, validate, createCategory);

router
  .route('/:id')
  .get(protect, staffRoles, getCategoryById)
  .put(protect, staffRoles, updateCategoryValidator, validate, updateCategory)
  .delete(protect, mgmtRoles, deleteCategory); // Cashiers CANNOT delete categories

module.exports = router;
