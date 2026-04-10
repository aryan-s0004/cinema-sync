const logger = require("../utils/logger");
const { expirePendingBookings } = require("./bookingService");
const seatService = require("./seatService");

const sweepIntervalMs = Math.max(Number(process.env.BOOKING_EXPIRY_SWEEP_SECONDS || 30), 10) * 1000;
let lastSweepAt = 0;
let runningSweep = null;

const runMaintenanceSweep = async ({ force = false } = {}) => {
  const now = Date.now();

  if (!force && now - lastSweepAt < sweepIntervalMs) {
    return { skipped: true };
  }

  if (runningSweep) {
    return runningSweep;
  }

  runningSweep = (async () => {
    lastSweepAt = now;

    try {
      const [expired, released] = await Promise.all([
        expirePendingBookings(),
        seatService.releaseExpiredLocks(),
      ]);

      return {
        skipped: false,
        expiredCount: expired.expiredCount,
        releasedLocks: released.modifiedCount || 0,
      };
    } catch (error) {
      logger.error("Booking maintenance sweep failed", { message: error.message });
      throw error;
    } finally {
      runningSweep = null;
    }
  })();

  return runningSweep;
};

module.exports = {
  expirePendingBookings,
  runMaintenanceSweep,
};
