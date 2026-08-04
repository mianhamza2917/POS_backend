const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { UPLOAD } = require('../utils/constants');

// Configure Cloudinary if environment variables are provided
const hasCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const isVercel = !!process.env.VERCEL;

// Ensure upload directories exist for local disk storage
const ensureDir = (dir) => {
  const fullPath = path.join(__dirname, '..', '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
};

// Always use local disk storage under uploads/
const storageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = UPLOAD.PROFILE_PATH;
    if (file.fieldname === 'logo') dest = UPLOAD.LOGO_PATH;
    else if (file.fieldname === 'product' || file.fieldname === 'image') dest = 'uploads/products';
    ensureDir(dest);
    cb(null, path.join(__dirname, '..', '..', dest));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const prefix = file.fieldname || 'upload';
    const timestamp = Date.now();
    cb(null, `${prefix}-${timestamp}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: JPEG, PNG, WebP`
      ),
      false
    );
  }
};

const uploadProfile = multer({
  storage: storageEngine,
  limits: { fileSize: UPLOAD.MAX_FILE_SIZE },
  fileFilter,
}).single('photo');

const uploadLogo = multer({
  storage: storageEngine,
  limits: { fileSize: UPLOAD.MAX_FILE_SIZE },
  fileFilter,
}).single('logo');

const uploadProduct = multer({
  storage: storageEngine,
  limits: { fileSize: UPLOAD.MAX_FILE_SIZE },
  fileFilter,
}).single('image');

// Helper to delete local file
const deleteFile = async (filePath) => {
  if (!filePath || filePath.startsWith('http://') || filePath.startsWith('https://')) return;

  const absolutePath = path.join(__dirname, '..', '..', filePath);
  if (fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
    } catch (err) {
      console.error('Failed to delete local file:', err.message);
    }
  }
};

const handleMulterError = (err, res) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5MB.',
      errors: ['File too large. Maximum size is 5MB.'],
    });
  }
  return res.status(400).json({
    success: false,
    message: err.message,
    errors: [err.message],
  });
};

const handleProfileUpload = (req, res, next) => {
  uploadProfile(req, res, (err) => {
    if (err) return handleMulterError(err, res);
    next();
  });
};

const handleLogoUpload = (req, res, next) => {
  uploadLogo(req, res, (err) => {
    if (err) return handleMulterError(err, res);
    next();
  });
};

const handleProductUpload = (req, res, next) => {
  uploadProduct(req, res, (err) => {
    if (err) return handleMulterError(err, res);
    next();
  });
};

module.exports = {
  handleProfileUpload,
  handleLogoUpload,
  handleProductUpload,
  deleteFile,
};
