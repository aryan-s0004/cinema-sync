const logger = require("../utils/logger");
const { expirePendingBookings } = require("./bookingService");

const startBookingExpiryJob = () => {
  const everySeconds = Math.max(Number(process.env.BOOKING_EXPIRY_SWEEP_SECONDS || 30), 10);
  const interval = setInterval(() => {
    expirePendingBookings().catch((error) => {
      logger.error("Booking expiry sweep failed", { message: error.message });
    });
  }, everySeconds * 1000);
  return interval;
};

module.exports = {
  expirePendingBookings,
  startBookingExpiryJob,
};
