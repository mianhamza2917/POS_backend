const mongoose = require('mongoose');

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
    profit: { type: Number, default: 0 },
   paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'Bank Transfer'],
    required: true
  },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'refunded'],
      default: 'paid',
    },
    notes: { type: String, maxlength: 500 },
    branchId: { type: String, default: 'main', trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// Index for fast date-range queries
// NOTE: invoiceNumber index is already created by unique:true on the field — do NOT add it again here
saleSchema.index({ createdAt: -1 });
saleSchema.index({ customer: 1 });

module.exports = mongoose.model('Sale', saleSchema);
