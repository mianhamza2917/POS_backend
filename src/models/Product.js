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
      trim: true,
      uppercase: true,
    },
    barcode: {
      type: String,
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

// Partial indexes for soft delete support
productSchema.index(
  { sku: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);
productSchema.index(
  { barcode: 1 },
  { unique: true, sparse: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);

// ═══════════════════════════════════════════════════════════════
// Auto-sync: After saving Product, create/update Inventory record
// ═══════════════════════════════════════════════════════════════
productSchema.post('save', async function (doc, next) {
  try {
    const Inventory = mongoose.model('Inventory');
    const inventoryRecord = await Inventory.findOne({ product: doc._id });

    if (inventoryRecord) {
      // Only update if the stock actually differs (avoid infinite loop)
      if (inventoryRecord.quantity !== doc.stock) {
        inventoryRecord.quantity = doc.stock;
        inventoryRecord.updatedBy = doc.updatedBy;
        // Use direct update to bypass post-save hook on Inventory
        await Inventory.updateOne(
          { _id: inventoryRecord._id },
          { $set: { quantity: doc.stock, updatedBy: doc.updatedBy } }
        );
      }
    } else {
      // Create inventory record for this product
      await Inventory.create({
        product: doc._id,
        quantity: doc.stock,
        branchId: doc.branchId || 'main',
        createdBy: doc.createdBy,
        updatedBy: doc.updatedBy,
      });
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Product', productSchema);
