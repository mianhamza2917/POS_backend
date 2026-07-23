/**
 * Serverless MongoDB Connection Helper
 *
 * VERCEL-SPECIFIC: In serverless environments (Vercel, AWS Lambda, etc.),
 * we need to cache the MongoDB connection across invocations.
 * Without caching, each serverless function call would open a new connection,
 * quickly exhausting the MongoDB connection pool limit.
 *
 * This module maintains a cached connection that persists across
 * serverless function invocations as long as the cloud function
 * runtime instance is kept warm.
 */
const mongoose = require('mongoose');

/**
 * Cached MongoDB connection for serverless environments
 * The `cached` variable persists across function invocations
 * as long as the Vercel serverless instance remains warm.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB with serverless-optimized caching
 *
 * @returns {Promise<typeof mongoose>} Mongoose connection instance
 */
const connectDB = async () => {
  // VERCEL-SPECIFIC: Return cached connection if already established
  if (cached.conn) {
    console.log('Using cached MongoDB connection');
    return cached.conn;
  }

  // VERCEL-SPECIFIC: If no connection promise exists, create one
  if (!cached.promise) {
    const MONGO_URI = process.env.MONGO_URI;

    if (!MONGO_URI) {
      console.error('MONGO_URI environment variable is not defined');
      throw new Error('MONGO_URI environment variable is required');
    }

    cached.promise = mongoose.connect(MONGO_URI).then((mongooseInstance) => {
      console.log('MongoDB connected successfully (serverless)');
      return mongooseInstance;
    });
  }

  // VERCEL-SPECIFIC: Wait for the connection promise to resolve
  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;

