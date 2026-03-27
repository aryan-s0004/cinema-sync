const fs = require("fs/promises");
const path = require("path");
const Ticket = require("../models/Ticket");
const ApiError = require("../utils/ApiError");

const ticketsDir = path.resolve(__dirname, "../../tickets");
const MAX_TICKET_FILES = Math.max(Number(process.env.TICKET_FILE_RETENTION || 60), 10);

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

const pruneOldTicketFiles = async () => {
  await ensureTicketsDir();
  const files = await fs.readdir(ticketsDir);
  const ticketFiles = files.filter((file) => file.endsWith(".json"));
  if (ticketFiles.length <= MAX_TICKET_FILES) return;

  const withStats = await Promise.all(
    ticketFiles.map(async (file) => {
      const fullPath = path.join(ticketsDir, file);
      const stat = await fs.stat(fullPath);
      return { fullPath, mtimeMs: stat.mtimeMs };
    })
  );

  withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const stale = withStats.slice(MAX_TICKET_FILES);

  await Promise.all(stale.map((item) => fs.unlink(item.fullPath).catch(() => {})));
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
  await pruneOldTicketFiles();
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
