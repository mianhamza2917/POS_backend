const mongoose = require('mongoose');
const { PAYMENT_METHODS, PAYMENT_STATUSES, FIELD_LENGTHS } = require('../utils/constants');

const saleItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true },
    sku: { type: String },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    unitPrice: { type: Number, required: true, min: [0, 'Unit price cannot be negative'] },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    items: {
      type: [saleItemSchema],
      validate: { validator: (v) => v.length > 0, message: 'Sale must have at least one item' },
    },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    changeAmount: { type: Number, default: 0, min: 0 },
    profit: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS.ALL,
      default: PAYMENT_METHODS.CASH,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES.ALL,
      default: PAYMENT_STATUSES.PAID,
    },
    notes: { type: String, maxlength: FIELD_LENGTHS.SALE_NOTES_MAX },
    branchId: { type: String, default: 'main', trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// Index for fast date-range queries
saleSchema.index({ createdAt: -1 });
saleSchema.index({ customer: 1 });

module.exports = mongoose.model('Sale', saleSchema);
