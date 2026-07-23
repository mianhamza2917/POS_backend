/**
 * Vercel Serverless Entry Point
 *
 * This is the entry point for Vercel serverless functions.
 * It exports the Express app directly so Vercel can handle routing.
 *
 * VERCEL-SPECIFIC: In serverless environments, we use a cached
 * MongoDB connection to prevent connection pooling issues.
 * Each serverless invocation could otherwise create a new connection,
 * exhausting database connection limits.
 */
const app = require('../src/app');
const connectDB = require('../src/config/db.serverless');

// Initialize cached MongoDB connection for the serverless environment
// VERCEL-SPECIFIC: This runs once per warm instance, not per request
connectDB();

// Export the Express app for Vercel serverless runtime
module.exports = app;

