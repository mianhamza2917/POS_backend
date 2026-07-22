const mongoose = require('mongoose');
const { FIELD_LENGTHS, DEFAULT_BRANCH_ID } = require('../utils/constants');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a category name'],
      trim: true,
      unique: true,
      maxlength: [FIELD_LENGTHS.CATEGORY_NAME_MAX, 'Category name cannot be more than 50 characters'],
    },
    description: {
      type: String,
      maxlength: [FIELD_LENGTHS.CATEGORY_DESC_MAX, 'Description cannot be more than 200 characters'],
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

module.exports = mongoose.model('Category', categorySchema);
