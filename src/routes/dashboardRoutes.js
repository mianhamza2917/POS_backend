const express = require('express');
const router = express.Router();
const { getDashboardStats, getSalesChart } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('admin', 'manager'), getDashboardStats);
router.get('/chart', protect, authorize('admin', 'manager'), getSalesChart);

module.exports = router;
