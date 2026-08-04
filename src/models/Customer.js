const mongoose = require('mongoose');
const { FIELD_LENGTHS, CUSTOMER_STATUSES, EMAIL_REGEX, DEFAULT_BRANCH_ID } = require('../utils/constants');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide customer name'],
      trim: true,
      maxlength: [FIELD_LENGTHS.CUSTOMER_NAME_MAX, 'Customer name cannot be more than 100 characters'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [
        EMAIL_REGEX,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Please provide customer phone number'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: CUSTOMER_STATUSES.ALL,
      default: CUSTOMER_STATUSES.ACTIVE,
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

// Partial indexes for soft delete support
customerSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
customerSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

module.exports = mongoose.model('Customer', customerSchema);
