const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide customer name'],
      trim: true,
      maxlength: [100, 'Customer name cannot be more than 100 characters'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Please provide customer phone number'],
      trim: true,
      unique: true,
      sparse: true,
    },
    address: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    branchId: {
      type: String,
      default: 'main',
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

module.exports = mongoose.model('Customer', customerSchema);
