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

// Ensure upload directories exist for local development
const ensureDir = (dir) => {
  if (isVercel || hasCloudinary) return;
  const fullPath = path.join(__dirname, '..', '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
};

// Use memoryStorage if running on Vercel or Cloudinary is active; diskStorage locally
const storageEngine = (isVercel || hasCloudinary)
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
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

const fileFilter = (req, file, cb) => {
  if (UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${UPLOAD.ALLOWED_TYPES.map((t) => t.split('/')[1]).join(', ')}`
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

// Helper to upload buffer to Cloudinary
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `pos-system/${folder}` },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Helper to delete file (local disk or Cloudinary)
const deleteFile = async (filePath) => {
  if (!filePath) return;

  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    if (hasCloudinary) {
      try {
        // Extract Cloudinary public_id from URL
        const parts = filePath.split('/');
        const filenameWithExt = parts[parts.length - 1];
        const folder = parts[parts.length - 2];
        const publicId = `pos-system/${folder}/${filenameWithExt.split('.')[0]}`;
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error('Failed to delete Cloudinary file:', err.message);
      }
    }
    return;
  }

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
  uploadProfile(req, res, async (err) => {
    if (err) return handleMulterError(err, res);
    if (!req.file) return next();

    if (hasCloudinary && req.file.buffer) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, 'profiles');
        req.file.filename = result.secure_url;
      } catch (cloudErr) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload image to cloud storage',
          errors: [cloudErr.message],
        });
      }
    }
    next();
  });
};

const handleLogoUpload = (req, res, next) => {
  uploadLogo(req, res, async (err) => {
    if (err) return handleMulterError(err, res);
    if (!req.file) return next();

    if (hasCloudinary && req.file.buffer) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, 'logos');
        req.file.filename = result.secure_url;
      } catch (cloudErr) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload logo to cloud storage',
          errors: [cloudErr.message],
        });
      }
    }
    next();
  });
};

module.exports = {
  handleProfileUpload,
  handleLogoUpload,
  deleteFile,
};
