const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, ".env") });

const connectDB = require("./config/db");
const app = require("./app");
const { startBookingExpiryJob } = require("./services/bookingExpiryService");

const requiredEnv = ["MONGO_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} is required in backend/.env`);
  }
}

const start = async () => {
  try {
    await connectDB();
    if (process.env.NODE_ENV !== "test") {
      startBookingExpiryJob();
    }
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`CinemaSync API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

start();
