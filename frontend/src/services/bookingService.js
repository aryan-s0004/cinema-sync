const Booking = require('../models/Booking');
const Seat = require('../models/Seat');
const Show = require('../models/Show');

const createBookingService = async (userId, showId, seatIds) => {
  const now = new Date();

  const show = await Show.findById(showId);
  if (!show) throw new Error("Show not found");

  const seats = await Seat.find({
    _id: { $in: seatIds },
    show: showId,
    status: 'locked',
    lockedBy: userId,
    lockedUntil: { $gt: now }
  });

  if (seats.length !== seatIds.length) {
    throw new Error("Seats not valid or lock expired");
  }

  const totalAmount = seats.length * show.price;

  const booking = await Booking.create({
    user: userId,
    show: showId,
    seats: seatIds,
    totalAmount,
    status: 'pending'
  });

  await Seat.updateMany(
    { _id: { $in: seatIds } },
    { status: 'booked', lockedBy: null, lockedUntil: null }
  );

  return booking;
};

module.exports = { createBookingService };
