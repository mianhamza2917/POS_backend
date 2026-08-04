// =========================================
// Centralized Constants for POS Backend
// =========================================

// ---------- User Roles ----------
const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  ALL: ['admin', 'manager', 'cashier'],
  MANAGEMENT: ['admin', 'manager'],
};
Object.freeze(USER_ROLES);

// ---------- Product Statuses ----------
const PRODUCT_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OUT_OF_STOCK: 'out_of_stock',
  ALL: ['active', 'inactive', 'out_of_stock'],
};
Object.freeze(PRODUCT_STATUSES);

// ---------- Customer Statuses ----------
const CUSTOMER_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ALL: ['active', 'inactive'],
};
Object.freeze(CUSTOMER_STATUSES);

// ---------- Sale / Payment ----------
const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  ONLINE: 'online',
  OTHER: 'other',
  ALL: ['cash', 'card', 'online', 'other'],
};
Object.freeze(PAYMENT_METHODS);

const PAYMENT_STATUSES = {
  PAID: 'paid',
  PENDING: 'pending',
  REFUNDED: 'refunded',
  ALL: ['paid', 'pending', 'refunded'],
};
Object.freeze(PAYMENT_STATUSES);

// ---------- Pagination ----------
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};
Object.freeze(PAGINATION);

// ---------- Sort Fields (controller-specific) ----------
const SORT_FIELDS = {
  CUSTOMERS: ['name', 'phone', 'createdAt', 'updatedAt'],
  PRODUCTS: ['name', 'price', 'stock', 'createdAt', 'updatedAt', 'sku'],
  CATEGORIES: ['name', 'createdAt', 'updatedAt'],
  INVENTORY: ['stock', 'name', 'sku', 'price', 'createdAt', 'updatedAt'],
  SALES: ['createdAt', 'totalAmount', 'invoiceNumber', 'paymentMethod'],
};
Object.freeze(SORT_FIELDS);

// ---------- Field Length Limits ----------
const FIELD_LENGTHS = {
  USER_NAME_MIN: 2,
  USER_NAME_MAX: 50,
  PASSWORD_MIN: 6,
  CUSTOMER_NAME_MAX: 100,
  CATEGORY_NAME_MAX: 50,
  CATEGORY_DESC_MAX: 200,
  PRODUCT_NAME_MAX: 100,
  PRODUCT_SKU_MAX: 50,
  PRODUCT_BARCODE_MAX: 50,
  PRODUCT_DESC_MAX: 500,
  SALE_NOTES_MAX: 500,
};
Object.freeze(FIELD_LENGTHS);

// ---------- Inventory Thresholds ----------
const INVENTORY = {
  LOW_STOCK_THRESHOLD: 10,
  DEFAULT_THRESHOLD: 10,
};
Object.freeze(INVENTORY);

// ---------- Dashboard Defaults ----------
const DASHBOARD = {
  RECENT_SALES_LIMIT: 5,
  TOP_PRODUCTS_LIMIT: 5,
};
Object.freeze(DASHBOARD);

// ---------- Report Limits ----------
const REPORT = {
  TOP_PRODUCTS_DEFAULT_LIMIT: 10,
  TOP_PRODUCTS_MAX_LIMIT: 50,
  CUSTOMER_DEFAULT_LIMIT: 10,
  CUSTOMER_MAX_LIMIT: 50,
};
Object.freeze(REPORT);

// ---------- Invoice ----------
const INVOICE = {
  PREFIX: 'INV-',
  SEQUENCE_PAD: 4,
};
Object.freeze(INVOICE);

// ---------- Bcrypt ----------
const BCRYPT = {
  SALT_ROUNDS: 10,
};
Object.freeze(BCRYPT);

// ---------- Default Branch ----------
const DEFAULT_BRANCH_ID = 'main';

// ---------- Upload ----------
const UPLOAD = {
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  PROFILE_PATH: 'uploads/profiles',
  LOGO_PATH: 'uploads/logos',
};
Object.freeze(UPLOAD);

// ---------- Settings Defaults ----------
const SETTINGS_DEFAULTS = {
  BUSINESS: {
    businessName: '',
    businessEmail: '',
    phone: '',
    currency: 'USD',
    businessAddress: '',
    logo: '',
  },
  TAX: {
    taxName: 'VAT',
    taxRate: 0,
    taxRegistrationNumber: '',
    enableTax: false,
  },
  INVOICE: {
    invoicePrefix: 'INV-',
    startingInvoiceNumber: 1,
    invoiceFooter: 'Thank you for your business!',
    showBusinessLogo: false,
    showTaxInformation: false,
  },
  PAYMENT_METHODS: {
    cash: true,
    card: true,
    onlinePayment: false,
    bankTransfer: false,
    cashOnDelivery: false,
  },
};
Object.freeze(SETTINGS_DEFAULTS);

// ---------- Error Messages ----------
const ERROR_MSGS = {
  NOT_FOUND: 'Resource not found',
  INVALID_ID: 'Resource not found / Invalid ID format',
  UNAUTHORIZED: 'Not authorized',
  INVALID_TOKEN: 'Invalid token',
  EXPIRED_TOKEN: 'Token expired',
  FORBIDDEN: 'Access denied',
  VALIDATION_FAILED: 'Validation failed',
  SERVER_ERROR: 'Internal Server Error',
  DUPLICATE_FIELD: (field) => `${field} already exists`,
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_DISABLED: 'Your account has been disabled. Please contact the administrator.',
  USER_NOT_FOUND: 'User not found or account removed',
};
Object.freeze(ERROR_MSGS);

// ---------- HTTP Status Codes ----------
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};
Object.freeze(HTTP_STATUS);

// ---------- Email Regex ----------
const EMAIL_REGEX = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

// ---------- Report Periods ----------
const REPORT_PERIODS = {
  TODAY: 'today',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};
Object.freeze(REPORT_PERIODS);

// ---------- Response Templates ----------
const RESPONSE_TEMPLATES = {
  success: (message, data = {}) => ({
    success: true,
    message,
    data,
  }),
  error: (message, errors = []) => ({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors],
  }),
};

module.exports = {
  USER_ROLES,
  PRODUCT_STATUSES,
  CUSTOMER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PAGINATION,
  SORT_FIELDS,
  FIELD_LENGTHS,
  INVENTORY,
  DASHBOARD,
  REPORT,
  INVOICE,
  BCRYPT,
  DEFAULT_BRANCH_ID,
  UPLOAD,
  SETTINGS_DEFAULTS,
  ERROR_MSGS,
  HTTP_STATUS,
  EMAIL_REGEX,
  REPORT_PERIODS,
  RESPONSE_TEMPLATES,
};
