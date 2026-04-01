const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, ".env") });

const connectDB = require("./config/db");
const app = require("./app");
const { startBookingExpiryJob } = require("./services/bookingExpiryService");
const logger = require("./utils/logger");

const requiredEnv = ["MONGO_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
const requiredInProduction = ["PAYMENT_WEBHOOK_SECRET", "TICKET_QR_SECRET"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} is required in backend/.env`);
  }
}

if (process.env.NODE_ENV === "production") {
  for (const key of requiredInProduction) {
    if (!process.env[key]) {
      throw new Error(`${key} is required in production backend/.env`);
    }
  }
}

const start = async () => {
  try {
    await connectDB();
    if (process.env.NODE_ENV !== "test") {
      startBookingExpiryJob();
    }
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      logger.info("CinemaSync API running", { port: PORT });
    });
    server.keepAliveTimeout = Math.max(Number(process.env.SERVER_KEEP_ALIVE_TIMEOUT_MS || 65000), 10000);
    server.headersTimeout = Math.max(Number(process.env.SERVER_HEADERS_TIMEOUT_MS || 66000), 11000);
    server.requestTimeout = Math.max(Number(process.env.SERVER_REQUEST_TIMEOUT_MS || 30000), 5000);
  } catch (error) {
    logger.error("Failed to start server", { message: error.message });
    process.exit(1);
  }
};

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled rejection", { message: error?.message || String(error) });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { message: error?.message || String(error) });
  process.exit(1);
});

start();
