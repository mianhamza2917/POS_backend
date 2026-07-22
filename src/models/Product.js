const mongoose = require('mongoose');
const { PRODUCT_STATUSES, FIELD_LENGTHS, DEFAULT_BRANCH_ID } = require('../utils/constants');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true,
      maxlength: [FIELD_LENGTHS.PRODUCT_NAME_MAX, 'Name cannot be more than 100 characters'],
    },
    sku: {
      type: String,
      required: [true, 'Please provide a SKU'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Please provide a category'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide a price'],
      min: [0, 'Price cannot be negative'],
    },
    costPrice: {
      type: Number,
      default: 0,
      min: [0, 'Cost price cannot be negative'],
    },
    stock: {
      type: Number,
      required: [true, 'Please provide stock quantity'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    status: {
      type: String,
      enum: PRODUCT_STATUSES.ALL,
      default: PRODUCT_STATUSES.ACTIVE,
    },
    image: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      maxlength: [FIELD_LENGTHS.PRODUCT_DESC_MAX, 'Description cannot be more than 500 characters'],
    },
    branchId: {
      type: String,
      default: DEFAULT_BRANCH_ID,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Update status based on stock
productSchema.pre('save', function (next) {
  if (this.stock === 0) {
    this.status = PRODUCT_STATUSES.OUT_OF_STOCK;
  } else if (this.stock > 0 && this.status === PRODUCT_STATUSES.OUT_OF_STOCK) {
    this.status = PRODUCT_STATUSES.ACTIVE;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
