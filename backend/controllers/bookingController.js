const Booking = require("../models/Booking");
const Seat = require("../models/Seat");
const Show = require("../models/Show");
const Ticket = require("../models/Ticket");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { releaseExpiredLocks } = require("./seatController");
const { parsePositiveInt } = require("../validators/common");

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

const createBooking = async (req, res, next) => {
  try {
    const { showId, seatIds } = req.body;
    const userId = req.user._id;

    if (!showId || !Array.isArray(seatIds) || !seatIds.length) {
      throw new ApiError(400, "showId and seatIds are required");
    }

    const uniqueSeatIds = [...new Set(seatIds.map((id) => String(id)))];
    const show = await Show.findById(showId).select("_id price status").lean();
    if (!show || show.status !== "active") {
      throw new ApiError(404, "Active show not found");
    }

    await releaseExpiredLocks(showId);
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
      await Seat.updateMany(
        { _id: { $in: uniqueSeatIds }, show: showId, status: "booked" },
        { $set: { status: "available", lockedBy: null, lockedUntil: null } }
      );
      throw new ApiError(409, "Some seats were taken. Please reselect seats.");
    }

    const totalAmount = show.price * uniqueSeatIds.length;
    let booking;
    try {
      const paymentExpiresAt = new Date(Date.now() + Math.max(Number(process.env.PAYMENT_WINDOW_MINUTES || 10), 5) * 60 * 1000);
      booking = await Booking.create({
        user: userId,
        show: showId,
        seats: uniqueSeatIds,
        totalAmount,
        status: "pending_payment",
        payment: {
          status: "initiated",
          paymentExpiresAt,
          initiatedAt: new Date(),
        },
      });
    } catch (error) {
      await Seat.updateMany(
        { _id: { $in: uniqueSeatIds }, show: showId, status: "booked" },
        { $set: { status: "available", lockedBy: null, lockedUntil: null } }
      );
      throw error;
    }

    await booking.populate([{ path: "show", populate: [{ path: "movie" }] }, { path: "seats" }]);
    res.status(201).json(new ApiResponse(201, booking, "Booking created. Proceed to payment."));
  } catch (error) {
    next(error);
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find({ user: req.user._id })
        .populate({ path: "show", populate: [{ path: "movie" }] })
        .populate("seats")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments({ user: req.user._id }),
    ]);

    res.json(
      new ApiResponse(200, bookings, "Bookings fetched", {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      })
    );
  } catch (error) {
    next(error);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id })
      .populate({ path: "show", populate: [{ path: "movie" }] })
      .populate("seats")
      .lean();

    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }
    res.json(new ApiResponse(200, booking, "Booking fetched"));
  } catch (error) {
    next(error);
  }
};

const getBookingQuote = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id }).select(
      "_id seats totalAmount status"
    );

    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    if (!["pending_payment", "confirmed"].includes(booking.status)) {
      throw new ApiError(400, "Quote unavailable for this booking status");
    }

    const quote = buildQuote(booking.totalAmount, booking.seats.length);
    res.json(new ApiResponse(200, { bookingId: String(booking._id), ...quote }, "Booking quote fetched"));
  } catch (error) {
    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (!booking) throw new ApiError(404, "Booking not found");
    if (booking.status === "cancelled") throw new ApiError(400, "Booking is already cancelled");

    booking.status = "cancelled";
    if (booking.payment) {
      booking.payment.status = booking.payment.status === "captured" ? "failed" : booking.payment.status;
    }
    await booking.save();

    await Seat.updateMany(
      { _id: { $in: booking.seats }, show: booking.show, status: "booked" },
      { $set: { status: "available", lockedBy: null, lockedUntil: null } }
    );

    await Ticket.updateMany({ booking: booking._id, user: req.user._id }, { $set: { status: "cancelled" } });

    res.json(new ApiResponse(200, booking, "Booking cancelled"));
  } catch (error) {
    next(error);
  }
};

module.exports = { createBooking, getMyBookings, getBookingById, getBookingQuote, cancelBooking };
