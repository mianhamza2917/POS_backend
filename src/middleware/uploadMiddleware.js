const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOAD } = require('../utils/constants');

// VERCEL-SPECIFIC: On Vercel, the filesystem is ephemeral and read-only
// except for /tmp. Files uploaded via multer.diskStorage will be lost
// after the function invocation. For production on Vercel, you should
// upload files to an external service (AWS S3, Cloudinary, etc.).
//
// For local development, diskStorage works as expected.

// Detect if we're running on Vercel (no persistent filesystem)
const isVercel = !!process.env.VERCEL;

// Ensure upload directories exist (only for local development)
const ensureDir = (dir) => {
  if (isVercel) return; // VERCEL-SPECIFIC: Skip directory creation on Vercel
  const fullPath = path.join(__dirname, '..', '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
};

// VERCEL-SPECIFIC: Use memoryStorage on Vercel (no persistent disk),
// diskStorage for local development
const storageEngine = isVercel
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        // Determine the destination based on the field name
        const dest = file.fieldname === 'photo' ? UPLOAD.PROFILE_PATH : UPLOAD.LOGO_PATH;
        ensureDir(dest);
        cb(null, path.join(__dirname, '..', '..', dest));
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const prefix = file.fieldname === 'photo' ? 'profile' : 'logo';
        const userId = file.fieldname === 'photo' && req.user ? req.user._id : 'unknown';
        const timestamp = Date.now();
        const idPart = file.fieldname === 'photo' ? `-${userId}` : '';
        cb(null, `${prefix}${idPart}-${timestamp}${ext}`);
      },
    });

// Profile photo upload configuration
const uploadProfile = multer({
  storage: storageEngine,
  limits: { fileSize: UPLOAD.MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${UPLOAD.ALLOWED_TYPES.map(t => t.split('/')[1]).join(', ')}`), false);
    }
  },
}).single('photo');

// Logo upload configuration
const uploadLogo = multer({
  storage: storageEngine,
  limits: { fileSize: UPLOAD.MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${UPLOAD.ALLOWED_TYPES.map(t => t.split('/')[1]).join(', ')}`), false);
    }
  },
}).single('logo');

// Helper to delete old file
// VERCEL-SPECIFIC: Only works locally. On Vercel, uploaded files are in memory,
// so file deletion should be handled via external storage service (S3, Cloudinary).
const deleteFile = (filePath) => {
  if (!filePath) return;
  const absolutePath = path.join(__dirname, '..', '..', filePath);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

// Error handler helper for multer errors
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

// Wrapper middleware for profile photo upload
const handleProfileUpload = (req, res, next) => {
  uploadProfile(req, res, (err) => {
    if (err) return handleMulterError(err, res);
    next();
  });
};

// Wrapper middleware for logo upload
const handleLogoUpload = (req, res, next) => {
  uploadLogo(req, res, (err) => {
    if (err) return handleMulterError(err, res);
    next();
  });
};

module.exports = {
  handleProfileUpload,
  handleLogoUpload,
  deleteFile,
};

