const Settings = require('../models/Settings');
const { deleteFile } = require('../middleware/uploadMiddleware');

// Helper: extract a subset of fields from settings document
const pickBusinessFields = (s) => ({
  businessName: s.businessName,
  businessEmail: s.businessEmail,
  phone: s.phone,
  currency: s.currency,
  businessAddress: s.businessAddress,
  logo: s.logo,
});

const pickTaxFields = (s) => ({
  taxName: s.taxName,
  taxRate: s.taxRate,
  taxRegistrationNumber: s.taxRegistrationNumber,
  enableTax: s.enableTax,
});

const pickInvoiceFields = (s) => ({
  invoicePrefix: s.invoicePrefix,
  startingInvoiceNumber: s.startingInvoiceNumber,
  invoiceFooter: s.invoiceFooter,
  showBusinessLogo: s.showBusinessLogo,
  showTaxInformation: s.showTaxInformation,
});

const pickPaymentFields = (s) => ({
  cash: s.cash,
  card: s.card,
  onlinePayment: s.onlinePayment,
  bankTransfer: s.bankTransfer,
  cashOnDelivery: s.cashOnDelivery,
});

// ---------- Business Settings ----------

// @desc    Get business settings
// @route   GET /api/settings/business
// @access  Private (Admin, Manager)
const getBusinessSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getOrCreate();

    res.status(200).json({
      success: true,
      message: 'Business settings retrieved successfully',
      data: pickBusinessFields(settings),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update business settings
// @route   PUT /api/settings/business
// @access  Private (Admin, Manager)
const updateBusinessSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getOrCreate();
    const { businessName, businessEmail, phone, currency, businessAddress } = req.body;

    if (businessName !== undefined) settings.businessName = businessName;
    if (businessEmail !== undefined) settings.businessEmail = businessEmail;
    if (phone !== undefined) settings.phone = phone;
    if (currency !== undefined) settings.currency = currency;
    if (businessAddress !== undefined) settings.businessAddress = businessAddress;

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Business settings updated successfully',
      data: pickBusinessFields(settings),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload business logo
// @route   PUT /api/settings/business/logo
// @access  Private (Admin, Manager)
const uploadBusinessLogo = async (req, res, next) => {
  try {
    const settings = await Settings.getOrCreate();

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        errors: ['Please select an image file to upload'],
      });
    }

    // Delete old logo if exists
    if (settings.logo) {
      deleteFile(settings.logo);
    }

    const relativePath = `uploads/logos/${req.file.filename}`;
    settings.logo = relativePath;
    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Business logo updated successfully',
      data: { logo: settings.logo },
    });
  } catch (error) {
    next(error);
  }
};

// ---------- Tax Settings ----------

// @desc    Get tax settings
// @route   GET /api/settings/tax
// @access  Private (Admin, Manager)
const getTaxSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getOrCreate();

    res.status(200).json({
      success: true,
      message: 'Tax settings retrieved successfully',
      data: pickTaxFields(settings),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update tax settings
// @route   PUT /api/settings/tax
// @access  Private (Admin, Manager)
const updateTaxSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getOrCreate();
    const { taxName, taxRate, taxRegistrationNumber, enableTax } = req.body;

    if (taxName !== undefined) settings.taxName = taxName;
    if (taxRate !== undefined) {
      const rate = Number(taxRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return res.status(400).json({
          success: false,
          message: 'Tax rate must be a number between 0 and 100',
          errors: ['Tax rate must be a number between 0 and 100'],
        });
      }
      settings.taxRate = rate;
    }
    if (taxRegistrationNumber !== undefined) settings.taxRegistrationNumber = taxRegistrationNumber;
    if (enableTax !== undefined) settings.enableTax = enableTax;

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Tax settings updated successfully',
      data: pickTaxFields(settings),
    });
  } catch (error) {
    next(error);
  }
};

// ---------- Invoice Settings ----------

// @desc    Get invoice settings
// @route   GET /api/settings/invoice
// @access  Private (Admin, Manager)
const getInvoiceSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getOrCreate();

    res.status(200).json({
      success: true,
      message: 'Invoice settings retrieved successfully',
      data: pickInvoiceFields(settings),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice settings
// @route   PUT /api/settings/invoice
// @access  Private (Admin, Manager)
const updateInvoiceSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getOrCreate();
    const { invoicePrefix, startingInvoiceNumber, invoiceFooter, showBusinessLogo, showTaxInformation } = req.body;

    if (invoicePrefix !== undefined) settings.invoicePrefix = invoicePrefix;
    if (startingInvoiceNumber !== undefined) {
      const num = Number(startingInvoiceNumber);
      if (isNaN(num) || num < 1) {
        return res.status(400).json({
          success: false,
          message: 'Starting invoice number must be a positive number',
          errors: ['Starting invoice number must be a positive number'],
        });
      }
      settings.startingInvoiceNumber = num;
    }
    if (invoiceFooter !== undefined) settings.invoiceFooter = invoiceFooter;
    if (showBusinessLogo !== undefined) settings.showBusinessLogo = showBusinessLogo;
    if (showTaxInformation !== undefined) settings.showTaxInformation = showTaxInformation;

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Invoice settings updated successfully',
      data: pickInvoiceFields(settings),
    });
  } catch (error) {
    next(error);
  }
};

// ---------- Payment Methods ----------

// @desc    Get payment methods
// @route   GET /api/settings/payment-methods
// @access  Private (Admin, Manager)
const getPaymentMethods = async (req, res, next) => {
  try {
    const settings = await Settings.getOrCreate();

    res.status(200).json({
      success: true,
      message: 'Payment methods retrieved successfully',
      data: pickPaymentFields(settings),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment methods
// @route   PUT /api/settings/payment-methods
// @access  Private (Admin, Manager)
const updatePaymentMethods = async (req, res, next) => {
  try {
    const settings = await Settings.getOrCreate();
    const { cash, card, onlinePayment, bankTransfer, cashOnDelivery } = req.body;

    // Build updated payment methods object
    const updated = {};
    if (cash !== undefined) updated.cash = cash;
    if (card !== undefined) updated.card = card;
    if (onlinePayment !== undefined) updated.onlinePayment = onlinePayment;
    if (bankTransfer !== undefined) updated.bankTransfer = bankTransfer;
    if (cashOnDelivery !== undefined) updated.cashOnDelivery = cashOnDelivery;

    // Merge with existing to check if at least one remains enabled
    const existing = pickPaymentFields(settings);
    const merged = { ...existing, ...updated };
    const atLeastOneEnabled = Object.values(merged).some(v => v === true);

    if (!atLeastOneEnabled) {
      return res.status(400).json({
        success: false,
        message: 'At least one payment method must remain enabled',
        errors: ['At least one payment method must remain enabled'],
      });
    }

    // Apply updates
    if (cash !== undefined) settings.cash = cash;
    if (card !== undefined) settings.card = card;
    if (onlinePayment !== undefined) settings.onlinePayment = onlinePayment;
    if (bankTransfer !== undefined) settings.bankTransfer = bankTransfer;
    if (cashOnDelivery !== undefined) settings.cashOnDelivery = cashOnDelivery;

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Payment methods updated successfully',
      data: pickPaymentFields(settings),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBusinessSettings,
  updateBusinessSettings,
  uploadBusinessLogo,
  getTaxSettings,
  updateTaxSettings,
  getInvoiceSettings,
  updateInvoiceSettings,
  getPaymentMethods,
  updatePaymentMethods,
};

