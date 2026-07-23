// VERCEL-SPECIFIC: dotenv is loaded here so env vars are available
// both locally and on Vercel (Vercel injects env vars via dashboard).
// In serverless, there's no .env file, so dotenv.config() is a no-op.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const customerRoutes = require('./routes/customerRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const saleRoutes = require('./routes/saleRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const reportRoutes = require('./routes/reportRoutes');
const profileRoutes = require('./routes/profileRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();

// Security middleware
app.use(helmet());

// CORS middleware
// VERCEL-SPECIFIC: CORS is configured to allow all origins in development.
// In production, set CORS_ORIGIN env var in Vercel dashboard to restrict access.
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
// VERCEL-SPECIFIC: Use 'combined' format in production for better logging
app.use(process.env.NODE_ENV === 'production' ? morgan('combined') : morgan('dev'));

// Serve uploaded files statically
// VERCEL-SPECIFIC: Vercel has an ephemeral filesystem — uploaded files are lost
// after deployment. The uploads directory may not exist on Vercel.
// Files should be stored on external services (S3, Cloudinary) in production.
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (fs.existsSync(uploadsDir)) {
  app.use('/uploads', express.static('uploads'));
}

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    version: '1.0.0',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// VERCEL-SPECIFIC: Essential for serverless — ensures Vercel doesn't
// try to handle static files that don't exist
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// 404 handler (catch-all for non-API routes)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
