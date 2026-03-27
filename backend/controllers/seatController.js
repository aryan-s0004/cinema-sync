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
    const show = await Show.findById(showId).select("_id status").lean();
    if (!show || show.status !== "active") throw new ApiError(404, "Active show not found");

    await releaseExpiredLocks(showId);
    const seats = await Seat.find({ show: showId }).sort({ row: 1, number: 1 }).lean();
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
    const show = await Show.findById(showId).select("_id status").lean();
    if (!show || show.status !== "active") {
      throw new ApiError(404, "Active show not found");
    }

    const now = new Date();
    const lockUntil = new Date(now.getTime() + LOCK_DURATION_MINUTES * 60 * 1000);

    await releaseExpiredLocks(showId);

    const availableSeats = await Seat.find({
      _id: { $in: uniqueSeatIds },
      show: showId,
      $or: [
        { status: "available" },
        { status: "locked", lockedUntil: { $lte: now } },
        { status: "locked", lockedBy: userId, lockedUntil: { $gt: now } },
      ],
    })
      .select("_id")
      .lean();

    if (availableSeats.length !== uniqueSeatIds.length) {
      throw new ApiError(409, "Some seats are already booked/locked by another user");
    }

    const result = await Seat.updateMany(
      {
        _id: { $in: uniqueSeatIds },
        show: showId,
        $or: [
          { status: "available" },
          { status: "locked", lockedUntil: { $lte: now } },
          { status: "locked", lockedBy: userId, lockedUntil: { $gt: now } },
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
      await Seat.updateMany(
        {
          _id: { $in: uniqueSeatIds },
          show: showId,
          status: "locked",
          lockedBy: userId,
          lockedUntil: lockUntil,
        },
        {
          $set: { status: "available", lockedBy: null, lockedUntil: null },
        }
      );
      throw new ApiError(409, "Some seats are already booked/locked by another user");
    }

    const seats = await Seat.find({ _id: { $in: uniqueSeatIds } }).sort({ row: 1, number: 1 }).lean();
    res.json(new ApiResponse(200, { lockUntil, seats }, `Seats locked for ${LOCK_DURATION_MINUTES} minutes`));
  } catch (error) {
    next(error);
  }
};

const scoreSeatWindow = ({
  windowSeats,
  rowIndex,
  totalRows,
  maxSeatNumber,
  preference,
}) => {
  const avgNumber = windowSeats.reduce((sum, seat) => sum + seat.number, 0) / windowSeats.length;
  const numberCenter = (maxSeatNumber + 1) / 2;
  const rowCenter = (totalRows - 1) / 2;

  const numberDistance = Math.abs(avgNumber - numberCenter);
  const rowDistance = Math.abs(rowIndex - rowCenter);

  const typeBonus = windowSeats.reduce((sum, seat) => {
    if (seat.type === "vip") return sum + 2;
    if (seat.type === "premium") return sum + 1;
    return sum;
  }, 0);

  let preferenceBonus = 0;
  if (preference === "front") {
    preferenceBonus = Math.max(0, totalRows - rowIndex) * 0.6;
  } else if (preference === "back") {
    preferenceBonus = rowIndex * 0.6;
  } else if (preference === "budget") {
    preferenceBonus = windowSeats.filter((seat) => seat.type === "standard").length * 0.8;
  } else if (preference === "premium") {
    preferenceBonus = windowSeats.filter((seat) => seat.type !== "standard").length * 0.8;
  }

  const score = 100 - numberDistance * 4 - rowDistance * 6 + typeBonus + preferenceBonus;
  return score;
};

const suggestSeats = async (req, res, next) => {
  try {
    const { showId, count, preference = "center" } = req.body;
    const show = await Show.findById(showId).select("_id status").lean();
    if (!show || show.status !== "active") throw new ApiError(404, "Active show not found");

    await releaseExpiredLocks(showId);

    const availableSeats = await Seat.find({ show: showId, status: "available" })
      .select("_id row number type")
      .sort({ row: 1, number: 1 })
      .lean();

    if (availableSeats.length < count) {
      throw new ApiError(409, "Not enough available seats for this suggestion");
    }

    const groupedByRow = availableSeats.reduce((acc, seat) => {
      if (!acc[seat.row]) acc[seat.row] = [];
      acc[seat.row].push(seat);
      return acc;
    }, {});

    const rows = Object.keys(groupedByRow).sort();
    const rowIndexMap = new Map(rows.map((row, index) => [row, index]));
    const maxSeatNumber = Math.max(...availableSeats.map((seat) => seat.number));

    const candidates = [];

    for (const row of rows) {
      const rowSeats = groupedByRow[row].slice().sort((a, b) => a.number - b.number);

      for (let start = 0; start <= rowSeats.length - count; start += 1) {
        const windowSeats = rowSeats.slice(start, start + count);
        const contiguous = windowSeats.every((seat, idx) => idx === 0 || seat.number === windowSeats[idx - 1].number + 1);
        if (!contiguous) continue;

        const score = scoreSeatWindow({
          windowSeats,
          rowIndex: rowIndexMap.get(row),
          totalRows: rows.length,
          maxSeatNumber,
          preference,
        });

        candidates.push({ score, seats: windowSeats });
      }
    }

    let chosen = null;
    if (candidates.length) {
      candidates.sort((a, b) => b.score - a.score);
      chosen = candidates[0];
    } else {
      const fallback = availableSeats.slice(0, count);
      chosen = { score: 0, seats: fallback };
    }

    const suggestedSeatIds = chosen.seats.map((seat) => String(seat._id));
    const seatLabels = chosen.seats.map((seat) => `${seat.row}${seat.number}`);

    res.json(
      new ApiResponse(
        200,
        {
          showId,
          count,
          preference,
          score: Number(chosen.score.toFixed(2)),
          seatIds: suggestedSeatIds,
          seatLabels,
          reason: "Best available contiguous cluster selected by position and preference.",
        },
        "Seat suggestion generated"
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = { getSeatsByShow, lockSeats, suggestSeats, releaseExpiredLocks };
