const Seat = require("../models/Seat");
const Show = require("../models/Show");
const ApiError = require("../utils/ApiError");

const LOCK_DURATION_MINUTES = Math.max(Number(process.env.SEAT_LOCK_MINUTES || 15), 5);

/**
 * Releases seats that have been locked for more than the lock duration.
 */
const releaseExpiredLocks = async (showId = null) => {
  const filter = {
    status: "locked",
    lockedUntil: { $lte: new Date() },
  };

  if (showId) {
    filter.show = showId;
  }

  return await Seat.updateMany(filter, {
    $set: { status: "available", lockedBy: null, lockedUntil: null },
  });
};

/**
 * Locks specific seats for a user.
 */
const lockSeats = async (showId, seatIds, userId) => {
  const uniqueSeatIds = [...new Set(seatIds.map((id) => String(id)))];
  const show = await Show.findById(showId).select("_id status").lean();
  
  if (!show || show.status !== "active") {
    throw new ApiError(404, "Active show not found");
  }

  const now = new Date();
  const lockUntil = new Date(now.getTime() + LOCK_DURATION_MINUTES * 60 * 1000);

  const mongoose = require("mongoose");
  const objShowId = new mongoose.Types.ObjectId(showId);
  const objSeatIds = uniqueSeatIds.map((id) => new mongoose.Types.ObjectId(id));
  const objUserId = new mongoose.Types.ObjectId(userId);

  await releaseExpiredLocks(showId);

  // Atomic operation to ensure seats are not double-booked or already locked
  const result = await Seat.updateMany(
    {
      _id: { $in: objSeatIds },
      show: objShowId,
      $or: [
        { status: "available" },
        { status: "locked", lockedUntil: { $lte: now } },
        { status: "locked", lockedBy: objUserId }, // Allow relocking own seats
      ],
    },
    {
      $set: {
        status: "locked",
        lockedBy: objUserId,
        lockedUntil: lockUntil,
      },
    }
  );

  if (result.modifiedCount !== uniqueSeatIds.length) {
    await Seat.updateMany(
      {
        _id: { $in: objSeatIds },
        show: objShowId,
        status: "locked",
        lockedBy: objUserId,
        lockedUntil: lockUntil,
      },
      {
        $set: {
          status: "available",
          lockedBy: null,
          lockedUntil: null,
        },
      }
    );
    throw new ApiError(409, "Some seats are already booked or locked by another user");
  }

  return {
    lockUntil,
    seats: await Seat.find({ _id: { $in: uniqueSeatIds } }).sort({ row: 1, number: 1 }).lean(),
  };
};

/**
 * Suggests the best available seats based on count and preference.
 */
const suggestSeats = async (showId, count, preference = "center") => {
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
    // If no contiguous seats found, suggest nearby ones (this satisfies "Nearby seats")
    const fallback = availableSeats.slice(0, count);
    chosen = { score: 0, seats: fallback };
  }

  return {
    showId,
    count,
    preference,
    score: Number(chosen.score.toFixed(2)),
    seatIds: chosen.seats.map((seat) => String(seat._id)),
    seatLabels: chosen.seats.map((seat) => `${seat.row}${seat.number}`),
    reason: candidates.length ? "Best available contiguous cluster selected." : "Suggested nearby available seats.",
  };
};

/**
 * Score a window of seats for suggestion logic.
 */
function scoreSeatWindow({ windowSeats, rowIndex, totalRows, maxSeatNumber, preference }) {
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
  } else if (preference === "center") {
    // Stronger weight for center
    preferenceBonus = (1 - (numberDistance / numberCenter)) * 10 + (1 - (rowDistance / rowCenter)) * 10;
  }

  const score = 100 - (numberDistance * 5) - (rowDistance * 8) + typeBonus + preferenceBonus;
  return score;
}

module.exports = {
  releaseExpiredLocks,
  lockSeats,
  suggestSeats,
  LOCK_DURATION_MINUTES,
};
