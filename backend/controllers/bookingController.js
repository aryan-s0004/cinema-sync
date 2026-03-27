const Booking = require("../models/Booking");
const Seat = require("../models/Seat");
const Show = require("../models/Show");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { releaseExpiredLocks } = require("./seatController");

const createBooking = async (req, res, next) => {
  try {
    const { showId, seatIds } = req.body;
    const userId = req.user._id;

    if (!showId || !Array.isArray(seatIds) || !seatIds.length) {
      throw new ApiError(400, "showId and seatIds are required");
    }

    const uniqueSeatIds = [...new Set(seatIds.map((id) => String(id)))];
    const show = await Show.findById(showId);
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
    });

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
      throw new ApiError(409, "Some seats were taken. Please reselect seats.");
    }

    const totalAmount = show.price * uniqueSeatIds.length;
    let booking;
    try {
      booking = await Booking.create({
        user: userId,
        show: showId,
        seats: uniqueSeatIds,
        totalAmount,
        status: "pending_payment",
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
    const bookings = await Booking.find({ user: req.user._id })
      .populate({ path: "show", populate: [{ path: "movie" }] })
      .populate("seats")
      .sort({ createdAt: -1 });

    res.json(new ApiResponse(200, bookings, "Bookings fetched"));
  } catch (error) {
    next(error);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id })
      .populate({ path: "show", populate: [{ path: "movie" }] })
      .populate("seats");

    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }
    res.json(new ApiResponse(200, booking, "Booking fetched"));
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

    res.json(new ApiResponse(200, booking, "Booking cancelled"));
  } catch (error) {
    next(error);
  }
};

module.exports = { createBooking, getMyBookings, getBookingById, cancelBooking };
