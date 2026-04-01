const Booking = require("../models/Booking");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { parsePositiveInt } = require("../validators/common");
const bookingService = require("../services/bookingService");

const createBooking = async (req, res, next) => {
  try {
    const { showId, seatIds } = req.body;
    const userId = req.user._id;

    if (!showId || !Array.isArray(seatIds) || !seatIds.length) {
      throw new ApiError(400, "showId and seatIds are required");
    }

    const booking = await bookingService.createBooking(userId, showId, seatIds);
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

    const quote = bookingService.buildQuote(booking.totalAmount, booking.seats.length);
    res.json(new ApiResponse(200, { bookingId: String(booking._id), ...quote }, "Booking quote fetched"));
  } catch (error) {
    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.cancelBooking(req.params.id, req.user._id);
    res.json(new ApiResponse(200, booking, "Booking cancelled"));
  } catch (error) {
    next(error);
  }
};

module.exports = { createBooking, getMyBookings, getBookingById, getBookingQuote, cancelBooking };
