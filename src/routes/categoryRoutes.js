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

const staffRoles = authorize('admin', 'manager', 'cashier');

// Category routes accessible by Admin, Manager, and Cashier
router
  .route('/')
  .get(protect, staffRoles, getCategories)
  .post(protect, staffRoles, createCategory);

router
  .route('/:id')
  .get(protect, staffRoles, getCategoryById)
  .put(protect, staffRoles, updateCategory)
  .delete(protect, staffRoles, deleteCategory);

module.exports = router;
