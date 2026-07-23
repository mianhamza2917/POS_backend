/**
 * Local Development Server Startup
 *
 * VERCEL-SPECIFIC: This file is used ONLY for local development.
 * For Vercel deployments, the entry point is `api/index.js`.
 * The `require('dotenv').config()` has been moved to `src/app.js`
 * so that environment variables are loaded both locally and on Vercel.
 */
const connectDB = require('./config/db');
const app = require('./app');

// Connect to MongoDB
connectDB();

// Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
