const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  mongoose.set("strictQuery", true);
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: Math.max(Number(process.env.MONGO_MAX_POOL_SIZE || 100), 20),
      minPoolSize: Math.max(Number(process.env.MONGO_MIN_POOL_SIZE || 5), 0),
      serverSelectionTimeoutMS: Math.max(Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000), 1000),
      socketTimeoutMS: Math.max(Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000), 5000),
    });
    logger.info("MongoDB connected", { host: conn.connection.host });
  } catch (error) {
    logger.error("MongoDB connection error", { message: error.message });
    process.exit(1);
  }
};

module.exports = connectDB;
