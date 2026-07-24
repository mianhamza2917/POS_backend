const mongoose = require('mongoose');
const { DEFAULT_BRANCH_ID, INVENTORY } = require('../utils/constants');

const inventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      unique: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      default: 0,
      min: [0, 'Quantity cannot be negative'],
    },
    lowStockThreshold: {
      type: Number,
      default: INVENTORY.LOW_STOCK_THRESHOLD,
      min: [1, 'Low stock threshold must be at least 1'],
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    lastRestockedAt: {
      type: Date,
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

// Index for fast lookups
inventorySchema.index({ quantity: 1 });
inventorySchema.index({ branchId: 1, isDeleted: 1 });

// ═══════════════════════════════════════════════════════════════
// Auto-sync: After saving Inventory, update Product.stock
// ═══════════════════════════════════════════════════════════════
inventorySchema.post('save', async function (doc, next) {
  try {
    const Product = mongoose.model('Product');
    if (doc.product) {
      await Product.findByIdAndUpdate(doc.product, { stock: doc.quantity }, { runValidators: false });
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Also sync on findOneAndUpdate
inventorySchema.post('findOneAndUpdate', async function (doc, next) {
  try {
    if (doc && doc.product) {
      const Product = mongoose.model('Product');
      await Product.findByIdAndUpdate(doc.product, { stock: doc.quantity }, { runValidators: false });
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Inventory', inventorySchema);

