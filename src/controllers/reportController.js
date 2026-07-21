const Sale = require('../models/Sale');
const { parsePagination } = require('../utils/queryHelper');

// Helper: build date range from period or explicit dates
const buildDateRange = (period, startDate, endDate) => {
  const now = new Date();
  if (startDate && endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { $gte: new Date(startDate), $lte: end };
  }
  switch (period) {
    case 'today': {
      return { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
    }
    case 'weekly': {
      const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      return { $gte: weekAgo };
    }
    case 'yearly': {
      return { $gte: new Date(now.getFullYear(), 0, 1) };
    }
    case 'monthly':
    default: {
      return { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    }
  }
};

// @desc    Sales summary report
// @route   GET /api/reports/sales
// @access  Private (Admin, Manager)
const getSalesReport = async (req, res, next) => {
  try {
    const { period = 'monthly', startDate, endDate, paymentMethod } = req.query;
    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const dateRange = buildDateRange(period, startDate, endDate);
    const query = { isDeleted: { $ne: true }, createdAt: dateRange };
    if (paymentMethod) query.paymentMethod = paymentMethod;

    const [summary, sales, total] = await Promise.all([
      Sale.aggregate([
        { $match: query },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalProfit: { $sum: '$profit' }, totalDiscount: { $sum: '$discountAmount' }, totalTax: { $sum: '$taxAmount' }, totalOrders: { $sum: 1 } } },
      ]),
      Sale.find(query).populate('customer', 'name').populate('createdBy', 'name').sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Sale.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      message: 'Sales report retrieved successfully',
      summary: summary[0] || { totalRevenue: 0, totalProfit: 0, totalDiscount: 0, totalTax: 0, totalOrders: 0 },
      count: sales.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: sales,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revenue & Profit chart data grouped by day/month
// @route   GET /api/reports/revenue
// @access  Private (Admin, Manager)
const getRevenueReport = async (req, res, next) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;
    const dateRange = buildDateRange(period, startDate, endDate);

    const groupBy = (period === 'yearly' || period === 'monthly')
      ? { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }
      : { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };

    const data = await Sale.aggregate([
      { $match: { isDeleted: { $ne: true }, paymentStatus: { $ne: 'refunded' }, createdAt: dateRange } },
      { $group: { _id: groupBy, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$profit' }, orders: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    res.status(200).json({ success: true, message: 'Revenue report retrieved successfully', data });
  } catch (error) {
    next(error);
  }
};

// @desc    Category-wise sales report
// @route   GET /api/reports/categories
// @access  Private (Admin, Manager)
const getCategoryReport = async (req, res, next) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;
    const dateRange = buildDateRange(period, startDate, endDate);

    const data = await Sale.aggregate([
      { $match: { isDeleted: { $ne: true }, createdAt: dateRange } },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'productInfo' } },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'categories', localField: 'productInfo.category', foreignField: '_id', as: 'categoryInfo' } },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$categoryInfo._id',
          categoryName: { $first: '$categoryInfo.name' },
          totalQty: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    res.status(200).json({ success: true, message: 'Category report retrieved successfully', data });
  } catch (error) {
    next(error);
  }
};

// @desc    Top selling products report
// @route   GET /api/reports/top-products
// @access  Private (Admin, Manager)
const getTopProductsReport = async (req, res, next) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;
    const limitNum = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const dateRange = buildDateRange(period, startDate, endDate);

    const data = await Sale.aggregate([
      { $match: { isDeleted: { $ne: true }, createdAt: dateRange } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          totalQty: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
        },
      },
      { $sort: { totalQty: -1 } },
      { $limit: limitNum },
    ]);

    res.status(200).json({ success: true, message: 'Top products report retrieved successfully', data });
  } catch (error) {
    next(error);
  }
};

// @desc    Customer purchase report
// @route   GET /api/reports/customers
// @access  Private (Admin, Manager)
const getCustomerReport = async (req, res, next) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;
    const limitNum = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const dateRange = buildDateRange(period, startDate, endDate);

    const data = await Sale.aggregate([
      { $match: { isDeleted: { $ne: true }, customer: { $ne: null }, createdAt: dateRange } },
      {
        $group: {
          _id: '$customer',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          lastPurchase: { $max: '$createdAt' },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: limitNum },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customerInfo' } },
      { $unwind: { path: '$customerInfo', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, name: '$customerInfo.name', phone: '$customerInfo.phone', email: '$customerInfo.email', totalOrders: 1, totalSpent: 1, lastPurchase: 1 } },
    ]);

    res.status(200).json({ success: true, message: 'Customer report retrieved successfully', data });
  } catch (error) {
    next(error);
  }
};

// @desc    Payment method breakdown
// @route   GET /api/reports/payment-methods
// @access  Private (Admin, Manager)
const getPaymentMethodReport = async (req, res, next) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;
    const dateRange = buildDateRange(period, startDate, endDate);

    const data = await Sale.aggregate([
      { $match: { isDeleted: { $ne: true }, createdAt: dateRange } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } },
      { $sort: { total: -1 } },
    ]);

    res.status(200).json({ success: true, message: 'Payment method report retrieved successfully', data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSalesReport, getRevenueReport, getCategoryReport, getTopProductsReport, getCustomerReport, getPaymentMethodReport };

