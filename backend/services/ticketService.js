const fs = require("fs/promises");
const path = require("path");
const Ticket = require("../models/Ticket");
const ApiError = require("../utils/ApiError");

const ticketsDir = path.resolve(__dirname, "../../tickets");

const ensureTicketsDir = async () => {
  await fs.mkdir(ticketsDir, { recursive: true });
};

const makeTicketCode = (bookingId) => {
  const suffix = String(bookingId).slice(-6).toUpperCase();
  return `CS-${Date.now().toString(36).toUpperCase()}-${suffix}`;
};

const buildSeatLabels = (seats = []) =>
  seats
    .map((seat) => `${seat.row}${seat.number}`)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const buildTicketPayload = (bookingDoc, userDoc, ticketCode) => {
  if (!bookingDoc?.show?.movie?.title) {
    throw new ApiError(500, "Booking is missing populated movie details for ticket generation");
  }

  const seatLabels = buildSeatLabels(bookingDoc.seats || []);

  return {
    booking: bookingDoc._id,
    user: userDoc._id,
    ticketCode,
    movieTitle: bookingDoc.show.movie.title,
    theatreName: bookingDoc.show.theatreName,
    screenName: bookingDoc.show.screenName,
    showTime: bookingDoc.show.showTime,
    seatLabels,
    amount: bookingDoc.totalAmount,
    qrData: `cinemasync://ticket/${ticketCode}`,
    status: "active",
  };
};

const writeTicketFile = async (ticket) => {
  await ensureTicketsDir();
  const filename = `${ticket.ticketCode}.json`;
  const fullPath = path.join(ticketsDir, filename);

  const fileBody = {
    ticketCode: ticket.ticketCode,
    bookingId: ticket.booking,
    userId: ticket.user,
    movieTitle: ticket.movieTitle,
    theatreName: ticket.theatreName,
    screenName: ticket.screenName,
    showTime: ticket.showTime,
    seatLabels: ticket.seatLabels,
    amount: ticket.amount,
    status: ticket.status,
    issuedAt: ticket.issuedAt,
    qrData: ticket.qrData,
  };

  await fs.writeFile(fullPath, JSON.stringify(fileBody, null, 2), "utf8");
  return fullPath;
};

const createOrUpdateTicketForBooking = async (bookingDoc, userDoc) => {
  const existing = await Ticket.findOne({ booking: bookingDoc._id, user: userDoc._id });
  const ticketCode = existing?.ticketCode || makeTicketCode(bookingDoc._id);

  const payload = buildTicketPayload(bookingDoc, userDoc, ticketCode);

  const ticket = await Ticket.findOneAndUpdate(
    { booking: bookingDoc._id, user: userDoc._id },
    { $set: payload },
    { upsert: true, returnDocument: "after", runValidators: true }
  );

  const filePath = await writeTicketFile(ticket);
  if (ticket.filePath !== filePath) {
    ticket.filePath = filePath;
    await ticket.save();
  }

  return ticket;
};

module.exports = {
  createOrUpdateTicketForBooking,
  buildSeatLabels,
};
