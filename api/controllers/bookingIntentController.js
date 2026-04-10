const BookingIntent = require("../models/BookingIntent");
const Show = require("../models/Show");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

const enrichIntent = async (intent) =>
  intent.populate({
    path: "show",
    select: "movie theatreName screenName showTime price status",
    populate: { path: "movie", select: "title posterPath" },
  });

const upsertBookingIntent = async (req, res, next) => {
  try {
    const { showId, seatIds, step, bookingId, paymentTransactionId, lockUntil, active } = req.body;

    const show = await Show.findById(showId).select("_id status").lean();
    if (!show || show.status !== "active") {
      throw new ApiError(404, "Active show not found");
    }

    const effectiveActive = step === "confirmation" ? false : Boolean(active);

    const update = {
      step,
      active: effectiveActive,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    if (seatIds !== undefined) update.seatIds = seatIds;
    if (bookingId !== undefined) update.booking = bookingId;
    if (paymentTransactionId !== undefined) update.paymentTransactionId = paymentTransactionId;
    if (lockUntil !== undefined) update.lockUntil = lockUntil ? new Date(lockUntil) : null;

    const intent = await BookingIntent.findOneAndUpdate(
      { user: req.user._id, show: showId, active: true },
      { $set: update, $setOnInsert: { user: req.user._id, show: showId } },
      { upsert: true, new: true }
    );

    const enriched = await enrichIntent(intent);
    res.json(new ApiResponse(200, enriched, "Booking intent saved"));
  } catch (error) {
    next(error);
  }
};

const getActiveBookingIntent = async (req, res, next) => {
  try {
    const filters = { user: req.user._id, active: true };
    if (req.query.showId) {
      filters.show = req.query.showId;
    }

    const intent = await BookingIntent.findOne(filters).sort({ updatedAt: -1 });
    if (!intent) {
      return res.json(new ApiResponse(200, null, "No active booking intent"));
    }

    const enriched = await enrichIntent(intent);
    res.json(new ApiResponse(200, enriched, "Active booking intent fetched"));
  } catch (error) {
    next(error);
  }
};

const closeBookingIntent = async (req, res, next) => {
  try {
    const intent = await BookingIntent.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, active: true },
      { $set: { active: false, step: "confirmation" } },
      { new: true }
    );

    if (!intent) {
      throw new ApiError(404, "Active booking intent not found");
    }

    const enriched = await enrichIntent(intent);
    res.json(new ApiResponse(200, enriched, "Booking intent closed"));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upsertBookingIntent,
  getActiveBookingIntent,
  closeBookingIntent,
};
