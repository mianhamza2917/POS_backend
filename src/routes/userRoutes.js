const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  disableUser,
  deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

router
  .route('/')
  .post(
    protect,
    authorize('admin', 'manager'),
    [
      body('name').trim().notEmpty().withMessage('Name is required'),
      body('email').trim().notEmpty().isEmail().withMessage('Please provide a valid email').normalizeEmail(),
      body('password').notEmpty().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
      body('role').optional().isIn(['admin', 'manager', 'cashier']).withMessage('Invalid role'),
    ],
    validate,
    createUser
  )
  .get(protect, authorize('admin', 'manager'), getUsers);

router
  .route('/:id')
  .get(protect, authorize('admin', 'manager'), getUserById)
  .put(protect, authorize('admin', 'manager'), updateUser)
  .delete(protect, authorize('admin', 'manager'), deleteUser);

router
  .route('/:id/disable')
  .patch(protect, authorize('admin'), disableUser);

module.exports = router;
