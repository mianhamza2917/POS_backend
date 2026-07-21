const Product = require('../models/Product');
const { parsePagination, parseSort } = require('../utils/queryHelper');

const ALLOWED_SORT_FIELDS = ['stock', 'name', 'sku', 'price', 'createdAt', 'updatedAt'];

// @desc    Get inventory overview (summary stats + full list with filters)
// @route   GET /api/inventory
// @access  Private (Admin, Manager, Cashier)
const getInventory = async (req, res, next) => {
  try {
    const { search, category, status, sortBy = 'stock', sortOrder = 'asc' } = req.query;
    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const sort = parseSort(sortBy, sortOrder, ALLOWED_SORT_FIELDS);

    const query = { isDeleted: { $ne: true } };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category = category;
    if (status) query.status = status;

    const [products, total, summary] = await Promise.all([
      Product.find(query).populate('category', 'name').sort(sort).skip(skip).limit(limitNum),
      Product.countDocuments(query),
      Product.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalStock: { $sum: '$stock' },
            lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', 10] }] }, 1, 0] } },
            outOfStock: { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } },
            totalValue: { $sum: { $multiply: ['$stock', '$price'] } },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      message: 'Inventory retrieved successfully',
      summary: summary[0] || { totalProducts: 0, totalStock: 0, lowStock: 0, outOfStock: 0, totalValue: 0 },
      count: products.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get low stock products (stock > 0 and <= threshold)
// @route   GET /api/inventory/low-stock
// @access  Private
const getLowStock = async (req, res, next) => {
  try {
    const threshold = Math.max(1, parseInt(req.query.threshold, 10) || 10);
    const products = await Product.find({
      isDeleted: { $ne: true },
      stock: { $gt: 0, $lte: threshold },
    }).populate('category', 'name').sort({ stock: 1 });

    res.status(200).json({ success: true, message: 'Low stock products retrieved', count: products.length, data: products });
  } catch (error) {
    next(error);
  }
};

// @desc    Get out-of-stock products
// @route   GET /api/inventory/out-of-stock
// @access  Private
const getOutOfStock = async (req, res, next) => {
  try {
    const products = await Product.find({ isDeleted: { $ne: true }, stock: 0 })
      .populate('category', 'name').sort({ updatedAt: -1 });

    res.status(200).json({ success: true, message: 'Out of stock products retrieved', count: products.length, data: products });
  } catch (error) {
    next(error);
  }
};

// @desc    Adjust stock (add/subtract with reason)
// @route   PATCH /api/inventory/:id/adjust
// @access  Private (Admin, Manager)
const adjustStock = async (req, res, next) => {
  try {
    const adjustment = parseInt(req.body.adjustment, 10);

    if (isNaN(adjustment) || adjustment === 0) {
      return res.status(400).json({ success: false, message: 'Adjustment must be a non-zero integer', errors: ['Invalid adjustment value'] });
    }

    const product = await Product.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found', errors: ['Product not found'] });
    }

    const newStock = product.stock + adjustment;
    if (newStock < 0) {
      return res.status(400).json({ success: false, message: 'Stock cannot go below zero', errors: ['Insufficient stock'] });
    }

    product.stock = newStock;
    product.updatedBy = req.user._id;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Stock adjusted by ${adjustment > 0 ? '+' : ''}${adjustment}. New stock: ${newStock}`,
      data: { _id: product._id, name: product.name, sku: product.sku, stock: product.stock, status: product.status },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getInventory, getLowStock, getOutOfStock, adjustStock };

