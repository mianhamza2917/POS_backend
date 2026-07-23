const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Business Settings
  businessName: {
    type: String,
    default: '',
    trim: true,
  },
  businessEmail: {
    type: String,
    default: '',
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    default: '',
    trim: true,
  },
  currency: {
    type: String,
    default: 'USD',
    trim: true,
  },
  businessAddress: {
    type: String,
    default: '',
    trim: true,
  },
  logo: {
    type: String,
    default: '',
  },

  // Tax Settings
  taxName: {
    type: String,
    default: 'Tax',
    trim: true,
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  taxRegistrationNumber: {
    type: String,
    default: '',
    trim: true,
  },
  enableTax: {
    type: Boolean,
    default: false,
  },

  // Invoice Settings
  invoicePrefix: {
    type: String,
    default: 'INV-',
    trim: true,
  },
  startingInvoiceNumber: {
    type: Number,
    default: 1,
    min: 1,
  },
  invoiceFooter: {
    type: String,
    default: '',
    trim: true,
  },
  showBusinessLogo: {
    type: Boolean,
    default: false,
  },
  showTaxInformation: {
    type: Boolean,
    default: false,
  },

  // Payment Methods
  cash: {
    type: Boolean,
    default: true,
  },
  card: {
    type: Boolean,
    default: true,
  },
  onlinePayment: {
    type: Boolean,
    default: false,
  },
  bankTransfer: {
    type: Boolean,
    default: false,
  },
  cashOnDelivery: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

/**
 * Get or create the singleton settings document.
 * This ensures there is always exactly one settings document in the database.
 */
settingsSchema.statics.getOrCreate = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);

