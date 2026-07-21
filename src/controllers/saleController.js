const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { generateInvoiceNumber } = require('../utils/invoiceHelper');
const { parsePagination, parseSort } = require('../utils/queryHelper');

const ALLOWED_SORT_FIELDS = ['createdAt', 'totalAmount', 'invoiceNumber', 'paymentMethod'];

// @desc    Create a new sale (atomic — uses sequential ops for standalone MongoDB)
// @route   POST /api/sales
// @access  Private (Admin, Manager, Cashier)
const createSale = async (req, res, next) => {
  try {
    const { customer, items, discountAmount = 0, taxAmount = 0, paymentMethod, notes } = req.body;

    let subtotal = 0;
    let profit = 0;
    const enrichedItems = [];
    const productsToUpdate = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.product, isDeleted: { $ne: true } });
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.product}`, errors: [`Product not found: ${item.product}`] });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for: ${product.name}`, errors: [`Insufficient stock for: ${product.name}`] });
      }

      const unitPrice = item.unitPrice !== undefined ? item.unitPrice : product.price;
      const itemDiscount = item.discount || 0;
      const total = (unitPrice * item.quantity) - itemDiscount;
      subtotal += total;
      profit += (unitPrice - (product.costPrice || 0)) * item.quantity - itemDiscount;

      enrichedItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice,
        discount: itemDiscount,
        total,
      });

      product.stock -= item.quantity;
      product.updatedBy = req.user._id;
      productsToUpdate.push(product.save());
    }

    if (discountAmount > subtotal) {
      return res.status(400).json({ success: false, message: 'Discount amount cannot exceed subtotal', errors: ['Discount exceeds subtotal'] });
    }

    const totalAmount = subtotal - discountAmount + taxAmount;
    if (totalAmount < 0) {
      return res.status(400).json({ success: false, message: 'Total amount cannot be negative', errors: ['Invalid total amount'] });
    }
    const invoiceNumber = await generateInvoiceNumber();

    const sale = await Sale.create({
      invoiceNumber,
      customer: customer || null,
      items: enrichedItems,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      profit,
      paymentMethod: paymentMethod || 'cash',
      notes,
      branchId: req.user.branchId || 'main',
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    // Update product stock after sale is created
    await Promise.all(productsToUpdate);

    const populated = await Sale.findById(sale._id)
      .populate('customer', 'name phone email')
      .populate('createdBy', 'name');

    res.status(201).json({ success: true, message: 'Sale created successfully', data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all sales with search, filter, pagination, date range
// @route   GET /api/sales
// @access  Private (Admin, Manager, Cashier)
const getSales = async (req, res, next) => {
  try {
    const { search, customer, paymentMethod, paymentStatus, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const sort = parseSort(sortBy, sortOrder, ALLOWED_SORT_FIELDS);

    const query = { isDeleted: { $ne: true } };
    if (search) query.$or = [{ invoiceNumber: { $regex: search, $options: 'i' } }];
    if (customer) query.customer = customer;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const [sales, total] = await Promise.all([
      Sale.find(query).populate('customer', 'name phone').populate('createdBy', 'name').sort(sort).skip(skip).limit(limitNum),
      Sale.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      message: 'Sales retrieved successfully',
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

// @desc    Get single sale by ID
// @route   GET /api/sales/:id
// @access  Private
const getSaleById = async (req, res, next) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .populate('customer', 'name phone email address')
      .populate('items.product', 'name sku barcode')
      .populate('createdBy', 'name email');

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found', errors: ['Sale not found'] });
    }

    res.status(200).json({ success: true, message: 'Sale retrieved successfully', data: sale });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete sale
// @route   DELETE /api/sales/:id
// @access  Private (Admin only)
const deleteSale = async (req, res, next) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found', errors: ['Sale not found'] });
    }

    sale.isDeleted = true;
    sale.deletedAt = new Date();
    sale.updatedBy = req.user._id;
    await sale.save();

    res.status(200).json({ success: true, message: 'Sale deleted successfully', data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { createSale, getSales, getSaleById, deleteSale };

