const { body } = require('express-validator');

const updateBusinessSettingsValidator = [
  body('businessName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Business name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Business name must be at most 100 characters'),
  body('businessEmail')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid business email')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .isString()
    .withMessage('Phone must be a string')
    .isLength({ max: 30 })
    .withMessage('Phone must be at most 30 characters'),
  body('currency')
    .optional()
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Currency must be between 1 and 10 characters'),
  body('businessAddress')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Business address must be at most 300 characters'),
];

const updateTaxSettingsValidator = [
  body('taxName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Tax name cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Tax name must be at most 50 characters'),
  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be a number between 0 and 100'),
  body('taxRegistrationNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Tax registration number must be at most 50 characters'),
  body('enableTax')
    .optional()
    .isBoolean()
    .withMessage('enableTax must be a boolean value'),
];

const updateInvoiceSettingsValidator = [
  body('invoicePrefix')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Invoice prefix cannot be empty')
    .isLength({ max: 20 })
    .withMessage('Invoice prefix must be at most 20 characters'),
  body('startingInvoiceNumber')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Starting invoice number must be a positive integer'),
  body('invoiceFooter')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Invoice footer must be at most 500 characters'),
  body('showBusinessLogo')
    .optional()
    .isBoolean()
    .withMessage('showBusinessLogo must be a boolean value'),
  body('showTaxInformation')
    .optional()
    .isBoolean()
    .withMessage('showTaxInformation must be a boolean value'),
];

const updatePaymentMethodsValidator = [
  body('cash')
    .optional()
    .isBoolean()
    .withMessage('cash must be a boolean value'),
  body('card')
    .optional()
    .isBoolean()
    .withMessage('card must be a boolean value'),
  body('onlinePayment')
    .optional()
    .isBoolean()
    .withMessage('onlinePayment must be a boolean value'),
  body('bankTransfer')
    .optional()
    .isBoolean()
    .withMessage('bankTransfer must be a boolean value'),
  body('cashOnDelivery')
    .optional()
    .isBoolean()
    .withMessage('cashOnDelivery must be a boolean value'),
];

module.exports = {
  updateBusinessSettingsValidator,
  updateTaxSettingsValidator,
  updateInvoiceSettingsValidator,
  updatePaymentMethodsValidator,
};

