const Booking = require("../models/Booking");
const Seat = require("../models/Seat");
const Show = require("../models/Show");
const Ticket = require("../models/Ticket");
const ApiError = require("../utils/ApiError");
const { createOrUpdateTicketForBooking } = require("./ticketService");
const seatService = require("./seatService");

const PAYMENT_WINDOW_MINUTES = Math.max(Number(process.env.PAYMENT_WINDOW_MINUTES || 10), 5);

const BOOKING_PAYMENT_STATE = Object.freeze({
  INITIATED: "initiated",
  PROCESSING: "processing",
  SUCCESS: "success",
  FAILED: "failed",
});

const populateBooking = (query) =>
  query.populate([{ path: "show", populate: [{ path: "movie" }] }, { path: "seats" }]);

const buildQuote = (baseAmount, seatCount) => {
  const normalizedBase = Math.max(Number(baseAmount || 0), 0);
  const convenienceFee = Math.round(Math.max(15, normalizedBase * 0.03));
  const taxes = Math.round(convenienceFee * 0.18);
  const totalPayable = normalizedBase + convenienceFee + taxes;

  return {
    seatCount,
    currency: "INR",
    baseAmount: normalizedBase,
    convenienceFee,
    taxes,
    totalPayable,
  };
};

const normalizeSeatIds = (seatIds = []) => [...new Set(seatIds.map((id) => String(id)))];

const isPaymentWindowExpired = (booking) => {
  const expiresAt = booking?.payment?.paymentExpiresAt;
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() <= Date.now();
};

const releaseBookedSeats = async ({ showId, seatIds }) =>
  Seat.updateMany(
    { _id: { $in: seatIds }, show: showId, status: "booked" },
    { $set: { status: "available", lockedBy: null, lockedUntil: null } }
  );

const createBooking = async (userId, showId, seatIds) => {
  const uniqueSeatIds = normalizeSeatIds(seatIds);
  const show = await Show.findById(showId).select("_id price status").lean();

  if (!show || show.status !== "active") {
    throw new ApiError(404, "Active show not found");
  }

  await seatService.releaseExpiredLocks(showId);
  const now = new Date();
  const lockedSeats = await Seat.find({
    _id: { $in: uniqueSeatIds },
    show: showId,
    status: "locked",
    lockedBy: userId,
    lockedUntil: { $gt: now },
  })
    .select("_id")
    .lean();

  if (lockedSeats.length !== uniqueSeatIds.length) {
    throw new ApiError(409, "Booking allowed only for your valid locked seats");
  }

  const reserveResult = await Seat.updateMany(
    {
      _id: { $in: uniqueSeatIds },
      show: showId,
      status: "locked",
      lockedBy: userId,
      lockedUntil: { $gt: now },
    },
    {
      $set: {
        status: "booked",
        lockedBy: null,
        lockedUntil: null,
      },
    }
  );

  if (reserveResult.modifiedCount !== uniqueSeatIds.length) {
    await releaseBookedSeats({ showId, seatIds: uniqueSeatIds });
    throw new ApiError(409, "Some seats were taken. Please reselect seats.");
  }

  try {
    const paymentExpiresAt = new Date(now.getTime() + PAYMENT_WINDOW_MINUTES * 60 * 1000);
    const booking = await Booking.create({
      user: userId,
      show: showId,
      seats: uniqueSeatIds,
      totalAmount: show.price * uniqueSeatIds.length,
      status: "pending_payment",
      payment: {
        provider: process.env.PAYMENT_PROVIDER || "mock",
        status: BOOKING_PAYMENT_STATE.INITIATED,
        paymentExpiresAt,
        initiatedAt: now,
        attempts: 0,
      },
    });

    return populateBooking(Booking.findById(booking._id)).then((doc) => doc);
  } catch (error) {
    await releaseBookedSeats({ showId, seatIds: uniqueSeatIds });
    throw error;
  }
};

const cancelBooking = async (bookingId, userId, reason = "Booking cancelled by user") => {
  const booking = await Booking.findOne({ _id: bookingId, user: userId });
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status === "cancelled") throw new ApiError(400, "Booking is already cancelled");

  booking.status = "cancelled";
  booking.payment = {
    ...(booking.payment || {}),
    status: BOOKING_PAYMENT_STATE.FAILED,
    failureReason: reason,
    failedAt: new Date(),
  };
  await booking.save();

  await releaseBookedSeats({ showId: booking.show, seatIds: booking.seats });
  await Ticket.updateMany({ booking: booking._id, user: userId }, { $set: { status: "cancelled" } });

  return populateBooking(Booking.findById(booking._id)).then((doc) => doc);
};

const markBookingAsFailed = async (booking, reason, status = "cancelled") => {
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  booking.status = status;
  booking.payment = {
    ...(booking.payment || {}),
    status: BOOKING_PAYMENT_STATE.FAILED,
    failureReason: reason,
    failedAt: new Date(),
  };
  await booking.save();
  await releaseBookedSeats({ showId: booking.show, seatIds: booking.seats });
  await Ticket.updateMany({ booking: booking._id }, { $set: { status: "cancelled" } });
  return booking;
};

const confirmBookingPayment = async (booking, userDoc, paymentUpdates = {}) => {
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.status !== "confirmed") {
    booking.status = "confirmed";
    booking.payment = {
      ...(booking.payment || {}),
      ...paymentUpdates,
      status: BOOKING_PAYMENT_STATE.SUCCESS,
      confirmedAt: paymentUpdates.confirmedAt || new Date(),
    };
    await booking.save();
  }

  const populatedBooking = await populateBooking(Booking.findById(booking._id));
  const ticket = await createOrUpdateTicketForBooking(populatedBooking, userDoc);
  return { booking: populatedBooking, ticket };
};

const expirePendingBookings = async () => {
  const now = new Date();
  const expiredBookings = await Booking.find({
    status: "pending_payment",
    "payment.paymentExpiresAt": { $lte: now },
  });

  for (const booking of expiredBookings) {
    await markBookingAsFailed(booking, "Payment window expired", "expired");
  }

  return { expiredCount: expiredBookings.length };
};

const getOwnedBooking = (bookingId, userId) => Booking.findOne({ _id: bookingId, user: userId });

const ensureBookablePaymentWindow = async (booking) => {
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.status === "confirmed") {
    return booking;
  }

  if (booking.status !== "pending_payment") {
    throw new ApiError(400, "Invalid booking status for payment");
  }

  if (!isPaymentWindowExpired(booking)) {
    return booking;
  }

  await markBookingAsFailed(booking, "Payment window expired", "expired");
  throw new ApiError(410, "Payment session expired. Please book seats again.");
};

const buildPaymentPayload = ({ booking, ticket = null, extra = {} }) => {
  const quote = buildQuote(booking.totalAmount, booking.seats?.length || 0);

  return {
    booking,
    ticket,
    bookingId: String(booking._id),
    bookingStatus: booking.status,
    paymentStatus: booking.payment?.status || null,
    quote,
    paymentExpiresAt: booking.payment?.paymentExpiresAt || null,
    ...extra,
  };
};

module.exports = {
  BOOKING_PAYMENT_STATE,
  PAYMENT_WINDOW_MINUTES,
  buildQuote,
  buildPaymentPayload,
  populateBooking,
  normalizeSeatIds,
  createBooking,
  cancelBooking,
  getOwnedBooking,
  ensureBookablePaymentWindow,
  confirmBookingPayment,
  markBookingAsFailed,
  expirePendingBookings,
  isPaymentWindowExpired,
};
