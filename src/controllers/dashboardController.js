const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Category = require('../models/Category');
const Customer = require('../models/Customer');
const { PAYMENT_STATUSES, INVENTORY } = require('../utils/constants');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard
// @access  Private (Admin, Manager)
const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const baseQuery = { isDeleted: { $ne: true }, paymentStatus: { $ne: PAYMENT_STATUSES.REFUNDED } };

    const [
      todaySalesAgg,
      monthlySalesAgg,
      lastMonthAgg,
      totalProducts,
      lowStockCount,
      outOfStockCount,
      totalCategories,
      totalCustomers,
      totalOrders,
      recentSales,
      topProducts,
    ] = await Promise.all([
      Sale.aggregate([
        { $match: { ...baseQuery, createdAt: { $gte: startOfToday } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$profit' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { ...baseQuery, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$profit' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { ...baseQuery, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      Product.countDocuments({ isDeleted: { $ne: true } }),
      Inventory.countDocuments({ isDeleted: { $ne: true }, quantity: { $gt: 0, $lte: INVENTORY.LOW_STOCK_THRESHOLD } }),
      Inventory.countDocuments({ isDeleted: { $ne: true }, quantity: 0 }),
      Category.countDocuments({ isDeleted: { $ne: true } }),
      Customer.countDocuments({ isDeleted: { $ne: true } }),
      Sale.countDocuments({ isDeleted: { $ne: true } }),
      Sale.find({ isDeleted: { $ne: true } })
        .populate('customer', 'name')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('invoiceNumber customer totalAmount paymentMethod paymentStatus createdAt'),
      Sale.aggregate([
        { $match: { ...baseQuery, createdAt: { $gte: startOfMonth } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', name: { $first: '$items.name' }, sku: { $first: '$items.sku' }, totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.total' } } },
        { $sort: { totalQty: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Populate category for top selling products
    if (topProducts.length > 0) {
      const productIds = topProducts.map(p => p._id);
      const productsWithCategory = await Product.find({ _id: { $in: productIds } })
        .populate('category', 'name')
        .select('_id category')
        .lean();

      const categoryMap = {};
      for (const product of productsWithCategory) {
        categoryMap[product._id.toString()] = product.category ? product.category.name : 'No Category';
      }

      topProducts.forEach(product => {
        product.category = categoryMap[product._id.toString()] || 'No Category';
      });
    }

    const todayData = todaySalesAgg[0] || { revenue: 0, profit: 0, count: 0 };
    const monthData = monthlySalesAgg[0] || { revenue: 0, profit: 0, count: 0 };
    const lastMonthData = lastMonthAgg[0] || { revenue: 0, count: 0 };

    const revenueGrowth = lastMonthData.revenue > 0
      ? (((monthData.revenue - lastMonthData.revenue) / lastMonthData.revenue) * 100).toFixed(1)
      : 0;

    res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        today: { revenue: todayData.revenue, profit: todayData.profit, orders: todayData.count },
        monthly: { revenue: monthData.revenue, profit: monthData.profit, orders: monthData.count, revenueGrowth: parseFloat(revenueGrowth) },
        inventory: { totalProducts, lowStock: lowStockCount, outOfStock: outOfStockCount },
        totals: { categories: totalCategories, customers: totalCustomers, orders: totalOrders },
        recentSales,
        topProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get cashier dashboard statistics (only the authenticated user's own data)
// @route   GET /api/dashboard/cashier
// @access  Private (Admin, Manager, Cashier)
const getCashierDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Cashiers can ONLY see sales they created
    const baseQuery = {
      isDeleted: { $ne: true },
      paymentStatus: { $ne: PAYMENT_STATUSES.REFUNDED },
      createdBy: req.user._id,
    };

    const [
      todaySalesAgg,
      monthlySalesAgg,
      lastMonthAgg,
      totalOwnOrders,
      recentSales,
      topProducts,
    ] = await Promise.all([
      Sale.aggregate([
        { $match: { ...baseQuery, createdAt: { $gte: startOfToday } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$profit' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { ...baseQuery, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$profit' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { ...baseQuery, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      Sale.countDocuments({ isDeleted: { $ne: true }, createdBy: req.user._id }),
      Sale.find(baseQuery)
        .populate('customer', 'name')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('invoiceNumber customer totalAmount paymentMethod paymentStatus createdAt'),
      Sale.aggregate([
        { $match: { ...baseQuery, createdAt: { $gte: startOfMonth } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', name: { $first: '$items.name' }, sku: { $first: '$items.sku' }, totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.total' } } },
        { $sort: { totalQty: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Populate category for top selling products
    if (topProducts.length > 0) {
      const productIds = topProducts.map(p => p._id);
      const productsWithCategory = await Product.find({ _id: { $in: productIds } })
        .populate('category', 'name')
        .select('_id category')
        .lean();

      const categoryMap = {};
      for (const product of productsWithCategory) {
        categoryMap[product._id.toString()] = product.category ? product.category.name : 'No Category';
      }

      topProducts.forEach(product => {
        product.category = categoryMap[product._id.toString()] || 'No Category';
      });
    }

    const todayData = todaySalesAgg[0] || { revenue: 0, profit: 0, count: 0 };
    const monthData = monthlySalesAgg[0] || { revenue: 0, profit: 0, count: 0 };
    const lastMonthData = lastMonthAgg[0] || { revenue: 0, count: 0 };

    const revenueGrowth = lastMonthData.revenue > 0
      ? (((monthData.revenue - lastMonthData.revenue) / lastMonthData.revenue) * 100).toFixed(1)
      : 0;

    res.status(200).json({
      success: true,
      message: 'Cashier dashboard statistics retrieved successfully',
      data: {
        today: { revenue: todayData.revenue, profit: todayData.profit, orders: todayData.count },
        monthly: { revenue: monthData.revenue, profit: monthData.profit, orders: monthData.count, revenueGrowth: parseFloat(revenueGrowth) },
        totals: { orders: totalOwnOrders },
        recentSales,
        topProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sales chart data (last 7 days or last 12 months)
// @route   GET /api/dashboard/chart
// @access  Private (Admin, Manager)
const getSalesChart = async (req, res, next) => {
  try {
    const { period = 'weekly' } = req.query;
    const now = new Date();
    let groupFormat, matchFrom;

    if (period === 'monthly') {
      matchFrom = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      groupFormat = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
    } else {
      matchFrom = new Date(now);
      matchFrom.setDate(matchFrom.getDate() - 6);
      matchFrom.setHours(0, 0, 0, 0);
      groupFormat = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };
    }

    const data = await Sale.aggregate([
      { $match: { isDeleted: { $ne: true }, paymentStatus: { $ne: PAYMENT_STATUSES.REFUNDED }, createdAt: { $gte: matchFrom } } },
      { $group: { _id: groupFormat, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$profit' }, orders: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    res.status(200).json({ success: true, message: 'Chart data retrieved successfully', data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats, getCashierDashboardStats, getSalesChart };
