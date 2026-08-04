const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const { parsePagination, parseSort } = require('../utils/queryHelper');
const { SORT_FIELDS, PRODUCT_STATUSES } = require('../utils/constants');

const ALLOWED_SORT_FIELDS = SORT_FIELDS.PRODUCTS;

// @desc    Get all products with filtering and search
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res, next) => {
  try {
    const { search, category, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
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
    if (category && category !== 'all') query.category = category;
    if (status) query.status = status;

    const [products, total] = await Promise.all([
      Product.find(query).populate('category', 'name').sort(sort).skip(skip).limit(limitNum),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
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

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Private
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).populate('category', 'name');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found', errors: ['Product not found'] });
    }

    res.status(200).json({ success: true, message: 'Product retrieved successfully', data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private (Admin, Manager, Cashier)
const createProduct = async (req, res, next) => {
  try {
    // Whitelist allowed fields — prevent mass assignment
    const { name, sku, barcode, category, price, costPrice, stock, description, image } = req.body;

    if (price !== undefined && price < 0) {
      return res.status(400).json({ success: false, message: 'Price cannot be negative', errors: ['Price cannot be negative'] });
    }
    if (stock !== undefined && stock < 0) {
      return res.status(400).json({ success: false, message: 'Stock cannot be negative', errors: ['Stock cannot be negative'] });
    }
    if (costPrice !== undefined && costPrice < 0) {
      return res.status(400).json({ success: false, message: 'Cost price cannot be negative', errors: ['Cost price cannot be negative'] });
    }

    if (sku) {
      const skuExists = await Product.findOne({ sku: sku.toUpperCase(), isDeleted: { $ne: true } });
      if (skuExists) {
        return res.status(400).json({ success: false, message: 'Product with this SKU already exists', errors: ['Duplicate SKU'] });
      }
    }

    if (barcode) {
      const barcodeExists = await Product.findOne({ barcode: barcode.toUpperCase(), isDeleted: { $ne: true } });
      if (barcodeExists) {
        return res.status(400).json({ success: false, message: 'Product with this Barcode already exists', errors: ['Duplicate Barcode'] });
      }
    }

    const product = await Product.create({
      name, sku, barcode, category, price, costPrice, stock: stock || 0, description, image,
      branchId: req.user.branchId || 'main',
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    // Automatically sync / create corresponding Inventory record
    await Inventory.findOneAndUpdate(
      { product: product._id },
      {
        $set: {
          product: product._id,
          quantity: stock || 0,
          location: 'Main Store',
          lowStockThreshold: 10,
          branchId: req.user.branchId || 'main',
          isDeleted: false,
          createdBy: req.user._id,
          updatedBy: req.user._id,
        },
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin, Manager, Cashier)
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found', errors: ['Product not found'] });
    }

    if (req.body.price !== undefined && req.body.price < 0) {
      return res.status(400).json({ success: false, message: 'Price cannot be negative', errors: ['Price cannot be negative'] });
    }
    if (req.body.stock !== undefined && req.body.stock < 0) {
      return res.status(400).json({ success: false, message: 'Stock cannot be negative', errors: ['Stock cannot be negative'] });
    }
    if (req.body.costPrice !== undefined && req.body.costPrice < 0) {
      return res.status(400).json({ success: false, message: 'Cost price cannot be negative', errors: ['Cost price cannot be negative'] });
    }

    // Check for duplicate SKU (if updating)
    if (req.body.sku) {
      const skuExists = await Product.findOne({ sku: req.body.sku.toUpperCase(), _id: { $ne: req.params.id }, isDeleted: { $ne: true } });
      if (skuExists) {
        return res.status(400).json({ success: false, message: 'Product with this SKU already exists', errors: ['Duplicate SKU'] });
      }
    }

    // Check for duplicate Barcode (if updating)
    if (req.body.barcode) {
      const barcodeExists = await Product.findOne({ barcode: req.body.barcode.toUpperCase(), _id: { $ne: req.params.id }, isDeleted: { $ne: true } });
      if (barcodeExists) {
        return res.status(400).json({ success: false, message: 'Product with this Barcode already exists', errors: ['Duplicate Barcode'] });
      }
    }

    // Whitelist updatable fields — prevent mass assignment
    const { name, sku, barcode, category, price, costPrice, stock, description, image, status } = req.body;
    if (name !== undefined) product.name = name;
    if (sku !== undefined) product.sku = sku;
    if (barcode !== undefined) product.barcode = barcode;
    if (category !== undefined) product.category = category;
    if (price !== undefined) product.price = price;
    if (costPrice !== undefined) product.costPrice = costPrice;
    if (stock !== undefined) product.stock = stock;
    if (description !== undefined) product.description = description;
    if (image !== undefined) product.image = image;
    if (status !== undefined) {
      if (!PRODUCT_STATUSES.ALL.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status value`, errors: [`Status must be ${PRODUCT_STATUSES.ALL.join(', ')}`] });
      }
      product.status = status;
    }
    product.updatedBy = req.user._id;

    // Use save() to trigger pre-save hooks (auto-update status based on stock)
    await product.save();

    // Sync inventory stock
    if (stock !== undefined) {
      await Inventory.findOneAndUpdate(
        { product: product._id },
        { $set: { quantity: stock, updatedBy: req.user._id } },
        { upsert: true }
      );
    }

    const populated = await Product.populate(product, { path: 'category', select: 'name' });

    res.status(200).json({ success: true, message: 'Product updated successfully', data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin, Manager, Cashier)
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found', errors: ['Product not found'] });
    }

    product.isDeleted = true;
    product.deletedAt = new Date();
    product.updatedBy = req.user._id;
    await product.save();

    // Soft delete corresponding Inventory record
    await Inventory.findOneAndUpdate(
      { product: product._id },
      { $set: { isDeleted: true, deletedAt: new Date(), updatedBy: req.user._id } }
    );

    res.status(200).json({ success: true, message: 'Product deleted successfully', data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product stock
// @route   PATCH /api/products/:id/stock
// @access  Private (Admin, Manager, Cashier)
const updateStock = async (req, res, next) => {
  try {
    const { stock } = req.body;

    if (stock === undefined || stock === null || isNaN(stock) || stock < 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid non-negative stock quantity', errors: ['Invalid stock value'] });
    }

    const product = await Product.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found', errors: ['Product not found'] });
    }

    product.stock = stock;
    product.updatedBy = req.user._id;
    await product.save();

    // Sync inventory quantity
    await Inventory.findOneAndUpdate(
      { product: product._id },
      { $set: { quantity: stock, updatedBy: req.user._id } },
      { upsert: true }
    );

    res.status(200).json({ success: true, message: 'Stock updated successfully', data: product });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct, updateStock };
