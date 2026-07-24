const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const { parsePagination, parseSort } = require('../utils/queryHelper');
const { SORT_FIELDS, INVENTORY } = require('../utils/constants');

const ALLOWED_SORT_FIELDS = SORT_FIELDS.INVENTORY;

// @desc    Get inventory overview (summary stats + full list with filters)
// @route   GET /api/inventory
// @access  Private (Admin, Manager, Cashier)
const getInventory = async (req, res, next) => {
  try {
    const { search, category, status, sortBy = 'stock', sortOrder = 'asc' } = req.query;
    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const sort = parseSort(sortBy, sortOrder, ALLOWED_SORT_FIELDS);

    // Build the base query for Inventory
    const invQuery = { isDeleted: { $ne: true } };
    const productQuery = { isDeleted: { $ne: true } };

    if (search) {
      productQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) productQuery.category = category;
    if (status) productQuery.status = status;

    // First, find matching product IDs
    const matchingProducts = await Product.find(productQuery).select('_id').lean();
    const matchingProductIds = matchingProducts.map((p) => p._id);
    invQuery.product = { $in: matchingProductIds };

    const [inventoryItems, total, summary] = await Promise.all([
      Inventory.find(invQuery)
        .populate({
          path: 'product',
          populate: { path: 'category', select: 'name' },
        })
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Inventory.countDocuments(invQuery),
      Inventory.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalStock: { $sum: '$quantity' },
            lowStock: {
              $sum: {
                $cond: [
                  { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$lowStockThreshold'] }] },
                  1,
                  0,
                ],
              },
            },
            outOfStock: { $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] } },
            totalValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$productPrice', 0] }] } },
          },
        },
      ]),
    ]);

    // Calculate totalValue using Product price lookup
    let totalValue = 0;
    const productIds = inventoryItems.map((item) => item.product?._id).filter(Boolean);
    if (productIds.length > 0) {
      const products = await Product.find({ _id: { $in: productIds } }).select('price').lean();
      const priceMap = {};
      for (const p of products) priceMap[p._id.toString()] = p.price;
      for (const item of inventoryItems) {
        const pid = item.product?._id?.toString();
        if (pid && priceMap[pid]) {
          totalValue += item.quantity * priceMap[pid];
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Inventory retrieved successfully',
      summary: {
        totalProducts: summary[0]?.totalProducts || 0,
        totalStock: summary[0]?.totalStock || 0,
        lowStock: summary[0]?.lowStock || 0,
        outOfStock: summary[0]?.outOfStock || 0,
        totalValue,
      },
      count: inventoryItems.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: inventoryItems,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single inventory record by ID
// @route   GET /api/inventory/:id
// @access  Private (Admin, Manager, Cashier)
const getInventoryById = async (req, res, next) => {
  try {
    const inventory = await Inventory.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .populate({
        path: 'product',
        populate: { path: 'category', select: 'name' },
      });

    if (!inventory) {
      return res.status(404).json({ success: false, message: 'Inventory record not found', errors: ['Inventory record not found'] });
    }

    res.status(200).json({ success: true, message: 'Inventory record retrieved successfully', data: inventory });
  } catch (error) {
    next(error);
  }
};

// @desc    Get low stock products (quantity > 0 and <= threshold)
// @route   GET /api/inventory/low-stock
// @access  Private
const getLowStock = async (req, res, next) => {
  try {
    const threshold = Math.max(1, parseInt(req.query.threshold, 10) || INVENTORY.DEFAULT_THRESHOLD);
    const sortOrder = parseInt(req.query.sortOrder, 10) === -1 ? -1 : 1;

    const items = await Inventory.find({
      isDeleted: { $ne: true },
      quantity: { $gt: 0, $lte: threshold },
    })
      .populate({
        path: 'product',
        populate: { path: 'category', select: 'name' },
      })
      .sort({ quantity: sortOrder });

    res.status(200).json({ success: true, message: 'Low stock products retrieved', count: items.length, data: items });
  } catch (error) {
    next(error);
  }
};

// @desc    Get out-of-stock products
// @route   GET /api/inventory/out-of-stock
// @access  Private
const getOutOfStock = async (req, res, next) => {
  try {
    const items = await Inventory.find({ isDeleted: { $ne: true }, quantity: 0 })
      .populate({
        path: 'product',
        populate: { path: 'category', select: 'name' },
      })
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, message: 'Out of stock products retrieved', count: items.length, data: items });
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

    const inventory = await Inventory.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!inventory) {
      return res.status(404).json({ success: false, message: 'Inventory record not found', errors: ['Inventory record not found'] });
    }

    const newStock = inventory.quantity + adjustment;
    if (newStock < 0) {
      return res.status(400).json({ success: false, message: 'Quantity cannot go below zero', errors: ['Insufficient stock'] });
    }

    inventory.quantity = newStock;
    inventory.updatedBy = req.user._id;
    await inventory.save();

    // Also sync the product stock
    await Product.findByIdAndUpdate(inventory.product, { stock: newStock, updatedBy: req.user._id });

    res.status(200).json({
      success: true,
      message: `Stock adjusted by ${adjustment > 0 ? '+' : ''}${adjustment}. New stock: ${newStock}`,
      data: inventory,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create inventory record for a product
// @route   POST /api/inventory
// @access  Private (Admin, Manager)
const createInventory = async (req, res, next) => {
  try {
    const { product, quantity, lowStockThreshold, location } = req.body;

    // Check product exists
    const productDoc = await Product.findOne({ _id: product, isDeleted: { $ne: true } });
    if (!productDoc) {
      return res.status(404).json({ success: false, message: 'Product not found', errors: ['Product not found'] });
    }

    // Check if inventory already exists for this product
    const existing = await Inventory.findOne({ product });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Inventory record already exists for this product', errors: ['Duplicate inventory record'] });
    }

    const inventory = await Inventory.create({
      product,
      quantity: quantity !== undefined ? quantity : productDoc.stock,
      lowStockThreshold: lowStockThreshold || INVENTORY.LOW_STOCK_THRESHOLD,
      location: location || '',
      branchId: req.user.branchId || 'main',
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    // Sync product stock
    productDoc.stock = inventory.quantity;
    productDoc.updatedBy = req.user._id;
    await productDoc.save();

    const populated = await Inventory.populate(inventory, {
      path: 'product',
      populate: { path: 'category', select: 'name' },
    });

    res.status(201).json({ success: true, message: 'Inventory record created successfully', data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete inventory record
// @route   DELETE /api/inventory/:id
// @access  Private (Admin, Manager)
const deleteInventory = async (req, res, next) => {
  try {
    const inventory = await Inventory.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!inventory) {
      return res.status(404).json({ success: false, message: 'Inventory record not found', errors: ['Inventory record not found'] });
    }

    inventory.isDeleted = true;
    inventory.deletedAt = new Date();
    inventory.updatedBy = req.user._id;
    await inventory.save();

    res.status(200).json({ success: true, message: 'Inventory record deleted successfully', data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventory,
  getInventoryById,
  getLowStock,
  getOutOfStock,
  adjustStock,
  createInventory,
  deleteInventory,
};

