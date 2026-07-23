const express = require('express');
const router = express.Router();
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  disableUser,
  deleteUser,
  toggleStatus,
  resetPasswordForUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createUserValidator, updateUserValidator, toggleStatusValidator, resetPasswordValidator } = require('../validators/userValidators');

router
  .route('/')
  .post(protect, authorize('admin', 'manager'), createUserValidator, validate, createUser)
  .get(protect, authorize('admin', 'manager'), getUsers);

router
  .route('/:id')
  .get(protect, authorize('admin', 'manager'), getUserById)
  .put(protect, authorize('admin', 'manager'), updateUserValidator, validate, updateUser)
  .delete(protect, authorize('admin', 'manager'), deleteUser);

router
  .route('/:id/disable')
  .patch(protect, authorize('admin'), disableUser);

router
  .route('/:id/status')
  .patch(protect, authorize('admin'), toggleStatusValidator, validate, toggleStatus);

router
  .route('/:id/reset-password')
  .patch(protect, authorize('admin'), resetPasswordValidator, validate, resetPasswordForUser);

module.exports = router;
