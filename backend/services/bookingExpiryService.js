const Booking = require("../models/Booking");
const Seat = require("../models/Seat");

const expirePendingBookings = async () => {
  const now = new Date();
  const staleBookings = await Booking.find({
    status: "pending_payment",
    "payment.paymentExpiresAt": { $lte: now },
  }).select("_id show seats payment status");

  if (!staleBookings.length) {
    return { expiredCount: 0 };
  }

  let expiredCount = 0;
  for (const booking of staleBookings) {
    booking.status = "expired";
    booking.payment = {
      ...(booking.payment || {}),
      status: "failed",
      failureReason: "Payment window expired",
      failedAt: now,
      locked: false,
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
    };
    await booking.save();

    await Seat.updateMany(
      { _id: { $in: booking.seats }, show: booking.show, status: "booked" },
      { $set: { status: "available", lockedBy: null, lockedUntil: null } }
    );
    expiredCount += 1;
  }

  return { expiredCount };
};

const startBookingExpiryJob = () => {
  const everySeconds = Math.max(Number(process.env.BOOKING_EXPIRY_SWEEP_SECONDS || 30), 10);
  const interval = setInterval(() => {
    expirePendingBookings().catch(() => {});
  }, everySeconds * 1000);
  return interval;
};

module.exports = {
  expirePendingBookings,
  startBookingExpiryJob,
};
