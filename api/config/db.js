const mongoose = require("mongoose");
const logger = require("../utils/logger");

let connectionPromise = null;

const connectDB = async () => {
  mongoose.set("strictQuery", true);
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    await connectionPromise;
    return mongoose.connection;
  }

  try {
    // Serverless-safe pool sizes: default to 5 max connections.
    // Math.max(..., 20) was removed — that would override env overrides and
    // exhaust Atlas connection limits on high-traffic serverless deployments.
    connectionPromise = mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 5),
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 1),
      serverSelectionTimeoutMS: Math.max(Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000), 1000),
      socketTimeoutMS: Math.max(Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000), 5000),
    });
    const conn = await connectionPromise;
    logger.info("MongoDB connected", { host: conn.connection.host });
    return conn.connection;
  } catch (error) {
    connectionPromise = null;
    logger.error("MongoDB connection error", { message: error.message });
    throw error;
  }
};

module.exports = connectDB;
