const express = require('express');
const router = express.Router();
const { getInventory, getLowStock, getOutOfStock, adjustStock } = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { adjustStockValidator } = require('../validators/inventoryValidators');

const staffRoles = authorize('admin', 'manager', 'cashier');

router.get('/', protect, staffRoles, getInventory);
router.get('/low-stock', protect, staffRoles, getLowStock);
router.get('/out-of-stock', protect, staffRoles, getOutOfStock);

router.patch(
  '/:id/adjust',
  protect,
  authorize('admin', 'manager'),
  adjustStockValidator,
  validate,
  adjustStock
);

module.exports = router;
