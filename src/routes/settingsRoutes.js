const express = require('express');
const router = express.Router();
const {
  getBusinessSettings,
  updateBusinessSettings,
  uploadBusinessLogo,
  getTaxSettings,
  updateTaxSettings,
  getInvoiceSettings,
  updateInvoiceSettings,
  getPaymentMethods,
  updatePaymentMethods,
} = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { handleLogoUpload } = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  updateBusinessSettingsValidator,
  updateTaxSettingsValidator,
  updateInvoiceSettingsValidator,
  updatePaymentMethodsValidator,
} = require('../validators/settingsValidators');

const mgmtRoles = authorize('admin', 'manager');

// Business Settings
router.get('/business', protect, mgmtRoles, getBusinessSettings);
router.put('/business', protect, mgmtRoles, updateBusinessSettingsValidator, validate, updateBusinessSettings);
router.put('/business/logo', protect, mgmtRoles, handleLogoUpload, uploadBusinessLogo);

// Tax Settings
router.get('/tax', protect, mgmtRoles, getTaxSettings);
router.put('/tax', protect, mgmtRoles, updateTaxSettingsValidator, validate, updateTaxSettings);

// Invoice Settings
router.get('/invoice', protect, mgmtRoles, getInvoiceSettings);
router.put('/invoice', protect, mgmtRoles, updateInvoiceSettingsValidator, validate, updateInvoiceSettings);

// Payment Methods
router.get('/payment-methods', protect, mgmtRoles, getPaymentMethods);
router.put('/payment-methods', protect, mgmtRoles, updatePaymentMethodsValidator, validate, updatePaymentMethods);

module.exports = router;

