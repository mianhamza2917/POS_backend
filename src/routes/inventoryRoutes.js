const express = require('express');
const router = express.Router();
const {
  getInventory,
  getInventoryById,
  getLowStock,
  getOutOfStock,
  adjustStock,
  createInventory,
  deleteInventory,
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { adjustStockValidator, createInventoryValidator } = require('../validators/inventoryValidators');

const staffRoles = authorize('admin', 'manager', 'cashier');
const mgmtRoles = authorize('admin', 'manager');

// Inventory routes
router.get('/', protect, staffRoles, getInventory);
router.get('/low-stock', protect, staffRoles, getLowStock);
router.get('/out-of-stock', protect, staffRoles, getOutOfStock);

router
  .route('/:id')
  .get(protect, staffRoles, getInventoryById)
  .delete(protect, mgmtRoles, deleteInventory);

router.post('/', protect, mgmtRoles, createInventoryValidator, validate, createInventory);

router.patch(
  '/:id/adjust',
  protect,
  mgmtRoles,
  adjustStockValidator,
  validate,
  adjustStock
);

module.exports = router;
