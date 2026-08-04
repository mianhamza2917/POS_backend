const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const { generateInvoiceNumber } = require('../utils/invoiceHelper');
const { parsePagination, parseSort } = require('../utils/queryHelper');
const { SORT_FIELDS, PAYMENT_METHODS, PAYMENT_STATUSES } = require('../utils/constants');

const ALLOWED_SORT_FIELDS = SORT_FIELDS.SALES;

// @desc    Create a new sale (atomic — uses sequential ops for standalone MongoDB)
// @route   POST /api/sales
// @access  Private (Admin, Manager, Cashier)
const createSale = async (req, res, next) => {
  try {
    const { customer, items, discountAmount = 0, taxAmount = 0, paymentMethod, notes, amountPaid, changeAmount } = req.body;

    let subtotal = 0;
    let profit = 0;
    const enrichedItems = [];
    const inventoryUpdates = [];

    for (const item of items) {
      // Check product exists
      const product = await Product.findOne({ _id: item.product, isDeleted: { $ne: true } });
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.product}`, errors: [`Product not found: ${item.product}`] });
      }

      // Check inventory record exists for this product
      const inventory = await Inventory.findOne({ product: item.product, isDeleted: { $ne: true } });
      if (!inventory) {
        return res.status(400).json({ success: false, message: `No inventory record for product: ${product.name}`, errors: [`No inventory record for ${product.name}`] });
      }

      // Check sufficient stock using Inventory.quantity
      if (inventory.quantity < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for: ${product.name} (available: ${inventory.quantity}, requested: ${item.quantity})`, errors: [`Insufficient stock for: ${product.name}`] });
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

      // Mark for atomic deduction
      inventoryUpdates.push({
        inventoryId: inventory._id,
        productName: product.name,
        quantity: item.quantity,
      });
    }

    if (discountAmount > subtotal) {
      return res.status(400).json({ success: false, message: 'Discount amount cannot exceed subtotal', errors: ['Discount exceeds subtotal'] });
    }

    const totalAmount = subtotal - discountAmount + taxAmount;
    if (totalAmount < 0) {
      return res.status(400).json({ success: false, message: 'Total amount cannot be negative', errors: ['Invalid total amount'] });
    }

    const finalPaymentMethod = paymentMethod || PAYMENT_METHODS.CASH;

    const Settings = require('../models/Settings');
    const settings = await Settings.getOrCreate();
    const methodSettingKeyMap = {
      cash: 'cash',
      card: 'card',
      online: 'onlinePayment',
      other: 'bankTransfer',
    };
    const settingKey = methodSettingKeyMap[finalPaymentMethod];
    if (settingKey && settings[settingKey] === false) {
      return res.status(400).json({
        success: false,
        message: `Payment method '${finalPaymentMethod}' is currently disabled in settings`,
        errors: [`Disabled payment method: ${finalPaymentMethod}`],
      });
    }

    const calcAmountPaid = amountPaid !== undefined && amountPaid !== null && !isNaN(Number(amountPaid))
      ? Number(amountPaid)
      : totalAmount;

    if (finalPaymentMethod === PAYMENT_METHODS.CASH && calcAmountPaid < totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Amount paid cannot be less than total amount',
        errors: ['Amount paid is insufficient'],
      });
    }

    const calcChangeAmount = changeAmount !== undefined && changeAmount !== null && !isNaN(Number(changeAmount))
      ? Number(changeAmount)
      : Math.max(0, calcAmountPaid - totalAmount);

    // Apply atomic inventory deductions BEFORE creating the sale record
    const appliedDeductions = [];
    for (const upd of inventoryUpdates) {
      const updatedInv = await Inventory.findOneAndUpdate(
        { _id: upd.inventoryId, quantity: { $gte: upd.quantity }, isDeleted: { $ne: true } },
        { $inc: { quantity: -upd.quantity }, $set: { updatedBy: req.user._id } },
        { new: true }
      );

      if (!updatedInv) {
        // Rollback previously applied deductions
        for (const done of appliedDeductions) {
          await Inventory.findOneAndUpdate(
            { _id: done.inventoryId },
            { $inc: { quantity: done.quantity } }
          );
        }
        return res.status(400).json({
          success: false,
          message: `Stock update failed due to concurrent activity for: ${upd.productName}`,
          errors: [`Stock update failed for: ${upd.productName}`],
        });
      }
      // Also update product stock to reflect inventory deduction
      const prod = await Product.findById(updatedInv.product);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - upd.quantity);
        await prod.save();
      }

      appliedDeductions.push(upd);
    }

    const invoiceNumber = await generateInvoiceNumber();

    // Create sale record
    const sale = await Sale.create({
      invoiceNumber,
      customer: customer || null,
      items: enrichedItems,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      amountPaid: calcAmountPaid,
      changeAmount: calcChangeAmount,
      profit,
      paymentMethod: finalPaymentMethod,
      notes,
      branchId: req.user.branchId || 'main',
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

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
    const { search, customer, paymentMethod, paymentStatus, startDate, endDate, createdBy, cashier, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const sort = parseSort(sortBy, sortOrder, ALLOWED_SORT_FIELDS);

    const query = { isDeleted: { $ne: true } };
    // Cashiers can only view their own sales history
    if (req.user.role === 'cashier') {
      query.createdBy = req.user._id;
    } else if (createdBy || cashier) {
      query.createdBy = createdBy || cashier;
    }
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
    const query = { _id: req.params.id, isDeleted: { $ne: true } };
    // Cashiers can only view their own transaction details (receipt)
    if (req.user.role === 'cashier') {
      query.createdBy = req.user._id;
    }

    const sale = await Sale.findOne(query)
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

// @desc    Soft delete sale (restores inventory stock)
// @route   DELETE /api/sales/:id
// @access  Private (Admin only)
const deleteSale = async (req, res, next) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found', errors: ['Sale not found'] });
    }

    // Restore inventory stock before soft-deleting
    for (const item of sale.items) {
      await Inventory.findOneAndUpdate(
        { product: item.product, isDeleted: { $ne: true } },
        { $inc: { quantity: item.quantity } }
      );
    }

    sale.isDeleted = true;
    sale.deletedAt = new Date();
    sale.updatedBy = req.user._id;
    await sale.save();

    res.status(200).json({ success: true, message: 'Sale deleted and stock restored successfully', data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Update sale details (items, discount, tax, notes, payment)
// @route   PUT /api/sales/:id
// @access  Private (Admin, Manager)
const updateSale = async (req, res, next) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found', errors: ['Sale not found'] });
    }

    // Only allow updating non-cancelled/non-refunded sales
    if (sale.paymentStatus === PAYMENT_STATUSES.REFUNDED) {
      return res.status(400).json({ success: false, message: 'Cannot update a refunded sale', errors: ['Sale is refunded'] });
    }

    const { customer, items, discountAmount, taxAmount, paymentMethod, paymentStatus, notes } = req.body;

    if (customer !== undefined) sale.customer = customer;
    if (paymentMethod !== undefined) {
      if (!PAYMENT_METHODS.ALL.includes(paymentMethod)) {
        return res.status(400).json({ success: false, message: 'Invalid payment method', errors: ['Invalid payment method'] });
      }
      sale.paymentMethod = paymentMethod;
    }
    if (paymentStatus !== undefined) {
      if (!PAYMENT_STATUSES.ALL.includes(paymentStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid payment status', errors: ['Invalid payment status'] });
      }
      sale.paymentStatus = paymentStatus;
    }
    if (notes !== undefined) sale.notes = notes;

    // If items are being updated, recalculate totals
    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Sale must have at least one item', errors: ['Invalid items'] });
      }

      // Restore original stock for previous items (via Inventory)
      for (const oldItem of sale.items) {
        await Inventory.findOneAndUpdate(
          { product: oldItem.product, isDeleted: { $ne: true } },
          { $inc: { quantity: oldItem.quantity } }
        );
      }

      let subtotal = 0;
      let profit = 0;
      const enrichedItems = [];

      for (const item of items) {
        const product = await Product.findOne({ _id: item.product, isDeleted: { $ne: true } });
        if (!product) {
          return res.status(404).json({ success: false, message: `Product not found: ${item.product}`, errors: [`Product not found: ${item.product}`] });
        }

        // Check inventory for new items
        const inventory = await Inventory.findOne({ product: item.product, isDeleted: { $ne: true } });
        if (!inventory) {
          return res.status(400).json({ success: false, message: `No inventory record for product: ${product.name}`, errors: [`No inventory record for ${product.name}`] });
        }

        if (inventory.quantity < item.quantity) {
          return res.status(400).json({ success: false, message: `Insufficient stock for: ${product.name} (available: ${inventory.quantity}, requested: ${item.quantity})`, errors: [`Insufficient stock for: ${product.name}`] });
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

        // Deduct from inventory
        inventory.quantity -= item.quantity;
        await inventory.save();
      }

      sale.items = enrichedItems;
      sale.subtotal = subtotal;
      sale.profit = profit;
    }

    const discAmount = discountAmount !== undefined ? discountAmount : sale.discountAmount;
    const taxAmt = taxAmount !== undefined ? taxAmount : sale.taxAmount;
    const sub = sale.subtotal;

    if (discAmount > sub) {
      return res.status(400).json({ success: false, message: 'Discount amount cannot exceed subtotal', errors: ['Discount exceeds subtotal'] });
    }

    if (discAmount !== undefined) sale.discountAmount = discAmount;
    if (taxAmt !== undefined) sale.taxAmount = taxAmt;
    sale.totalAmount = sub - discAmount + taxAmt;
    if (sale.totalAmount < 0) {
      return res.status(400).json({ success: false, message: 'Total amount cannot be negative', errors: ['Invalid total amount'] });
    }

    sale.updatedBy = req.user._id;
    await sale.save();

    const populated = await Sale.findById(sale._id)
      .populate('customer', 'name phone email')
      .populate('createdBy', 'name');

    res.status(200).json({ success: true, message: 'Sale updated successfully', data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel sale (restore stock, set payment to refunded)
// @route   PATCH /api/sales/:id/cancel
// @access  Private (Admin, Manager)
const cancelSale = async (req, res, next) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found', errors: ['Sale not found'] });
    }
    if (sale.paymentStatus === PAYMENT_STATUSES.REFUNDED) {
      return res.status(400).json({ success: false, message: 'Sale is already refunded', errors: ['Already refunded'] });
    }

    // Restore inventory stock
    for (const item of sale.items) {
      await Inventory.findOneAndUpdate(
        { product: item.product, isDeleted: { $ne: true } },
        { $inc: { quantity: item.quantity } }
      );
    }

    sale.paymentStatus = PAYMENT_STATUSES.REFUNDED;
    sale.updatedBy = req.user._id;
    await sale.save();

    res.status(200).json({ success: true, message: 'Sale cancelled and stock restored', data: sale });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete sale (mark as paid if pending)
// @route   PATCH /api/sales/:id/complete
// @access  Private (Admin, Manager, Cashier)
const completeSale = async (req, res, next) => {
  try {
    const query = { _id: req.params.id, isDeleted: { $ne: true } };
    // Cashiers can only complete their own sales
    if (req.user.role === 'cashier') {
      query.createdBy = req.user._id;
    }

    const sale = await Sale.findOne(query);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found', errors: ['Sale not found'] });
    }
    if (sale.paymentStatus === PAYMENT_STATUSES.REFUNDED) {
      return res.status(400).json({ success: false, message: 'Cannot complete a refunded sale', errors: ['Sale is refunded'] });
    }

    sale.paymentStatus = PAYMENT_STATUSES.PAID;
    sale.updatedBy = req.user._id;
    await sale.save();

    res.status(200).json({ success: true, message: 'Sale completed successfully', data: sale });
  } catch (error) {
    next(error);
  }
};

module.exports = { createSale, getSales, getSaleById, updateSale, cancelSale, completeSale, deleteSale };

