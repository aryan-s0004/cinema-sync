const Seat = require("../models/Seat");
const Show = require("../models/Show");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

const LOCK_DURATION_MINUTES = Number(process.env.SEAT_LOCK_MINUTES || 10);

const releaseExpiredLocks = async (showId = null) => {
  const filter = {
    status: "locked",
    lockedUntil: { $lte: new Date() },
  };

  if (showId) {
    filter.show = showId;
  }

  await Seat.updateMany(filter, {
    $set: { status: "available", lockedBy: null, lockedUntil: null },
  });
};

const getSeatsByShow = async (req, res, next) => {
  try {
    const { showId } = req.params;
    const show = await Show.findById(showId);
    if (!show) throw new ApiError(404, "Show not found");

    await releaseExpiredLocks(showId);
    const seats = await Seat.find({ show: showId }).sort({ row: 1, number: 1 });
    res.json(new ApiResponse(200, seats, "Seats fetched"));
  } catch (error) {
    next(error);
  }
};

const lockSeats = async (req, res, next) => {
  try {
    const { showId, seatIds } = req.body;
    const userId = req.user._id;

    if (!showId || !Array.isArray(seatIds) || !seatIds.length) {
      throw new ApiError(400, "showId and seatIds are required");
    }

    const uniqueSeatIds = [...new Set(seatIds.map((id) => String(id)))];
    const now = new Date();
    const lockUntil = new Date(now.getTime() + LOCK_DURATION_MINUTES * 60 * 1000);

    await releaseExpiredLocks(showId);

    const result = await Seat.updateMany(
      {
        _id: { $in: uniqueSeatIds },
        show: showId,
        $or: [
          { status: "available" },
          { status: "locked", lockedUntil: { $lte: now } },
          { status: "locked", lockedBy: userId },
        ],
      },
      {
        $set: {
          status: "locked",
          lockedBy: userId,
          lockedUntil: lockUntil,
        },
      }
    );

    if (result.modifiedCount !== uniqueSeatIds.length) {
      throw new ApiError(409, "Some seats are already booked/locked by another user");
    }

    const seats = await Seat.find({ _id: { $in: uniqueSeatIds } }).sort({ row: 1, number: 1 });
    res.json(new ApiResponse(200, { lockUntil, seats }, `Seats locked for ${LOCK_DURATION_MINUTES} minutes`));
  } catch (error) {
    next(error);
  }
};

module.exports = { getSeatsByShow, lockSeats, releaseExpiredLocks };
