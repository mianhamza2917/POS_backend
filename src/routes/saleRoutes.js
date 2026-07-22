const express = require('express');
const router = express.Router();
const { createSale, getSales, getSaleById, updateSale, cancelSale, completeSale, deleteSale } = require('../controllers/saleController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createSaleValidator, updateSaleValidator } = require('../validators/saleValidators');

const staffRoles = authorize('admin', 'manager', 'cashier');
const mgmtRoles = authorize('admin', 'manager');

router
  .route('/')
  .get(protect, staffRoles, getSales)
  .post(protect, staffRoles, createSaleValidator, validate, createSale);

router
  .route('/:id')
  .get(protect, staffRoles, getSaleById)
  .put(protect, mgmtRoles, updateSaleValidator, validate, updateSale)
  .delete(protect, authorize('admin'), deleteSale);

// Cancel sale (restore stock) - Admin/Manager only
router.patch('/:id/cancel', protect, mgmtRoles, cancelSale);

// Complete sale (mark as paid) - All staff
router.patch('/:id/complete', protect, staffRoles, completeSale);

module.exports = router;
