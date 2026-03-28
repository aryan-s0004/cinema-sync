const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const Ticket = require("../models/Ticket");
const ApiError = require("../utils/ApiError");
const { buildSignedQrData } = require("./ticketSecurityService");

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

const formatTicketDate = (value) => {
  const showDate = new Date(value);
  if (Number.isNaN(showDate.getTime())) return "N/A";

  return showDate.toLocaleString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
};

const formatAmount = (amount) =>
  Math.max(Number(amount || 0), 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const hasSignedQrToken = (qrData) => /[?&]token=/.test(String(qrData || ""));

const ensureSignedQrData = async (ticketDoc) => {
  if (!ticketDoc || hasSignedQrToken(ticketDoc.qrData)) {
    return false;
  }

  ticketDoc.qrData = buildSignedQrData({
    ticketCode: ticketDoc.ticketCode,
    bookingId: ticketDoc.booking,
    userId: ticketDoc.user,
    showTime: ticketDoc.showTime,
  });
  await ticketDoc.save();
  return true;
};

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
    qrData: buildSignedQrData({
      ticketCode,
      bookingId: bookingDoc._id,
      userId: userDoc._id,
      showTime: bookingDoc.show.showTime,
    }),
    status: "active",
  };
};

const writeTicketFile = async (ticket) => {
  await ensureTicketsDir();
  const filename = `${ticket.ticketCode}.pdf`;
  const fullPath = path.join(ticketsDir, filename);
  const qrBuffer = await QRCode.toBuffer(String(ticket.qrData || ticket.ticketCode), {
    type: "png",
    width: 300,
    margin: 1,
  });
  const issuedAt = formatTicketDate(ticket.issuedAt || new Date());
  const showTime = formatTicketDate(ticket.showTime);
  const seats = Array.isArray(ticket.seatLabels) && ticket.seatLabels.length ? ticket.seatLabels.join(", ") : "N/A";

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fsSync.createWriteStream(fullPath);

    stream.on("finish", resolve);
    stream.on("error", reject);
    doc.on("error", reject);

    doc.pipe(stream);

    doc.rect(0, 0, doc.page.width, 120).fill("#0f172a");
    doc.fillColor("#f8fafc").fontSize(26).text("CinemaSync e-Ticket", 50, 38);
    doc.fillColor("#cbd5e1").fontSize(10).text(`Ticket Code: ${ticket.ticketCode}`, 50, 82);

    doc.roundedRect(50, 132, doc.page.width - 100, 360, 12).lineWidth(1).strokeColor("#e2e8f0").stroke();

    doc.fillColor("#1e293b").fontSize(16).text(String(ticket.movieTitle || "Movie"), 70, 160, { width: 300 });

    const left = 70;
    let top = 208;
    const lineGap = 56;
    const drawField = (label, value) => {
      doc.fillColor("#64748b").fontSize(10).text(label, left, top);
      doc.fillColor("#0f172a").fontSize(13).text(String(value || "N/A"), left, top + 14, { width: 310 });
      top += lineGap;
    };

    drawField("THEATRE", `${ticket.theatreName || "Theatre"} - ${ticket.screenName || "Screen"}`);
    drawField("SHOW TIME", showTime);
    drawField("SEATS", seats);
    drawField("AMOUNT PAID", formatAmount(ticket.amount));

    const qrX = doc.page.width - 210;
    doc.roundedRect(qrX, 192, 140, 140, 10).lineWidth(1).strokeColor("#cbd5e1").stroke();
    doc.image(qrBuffer, qrX + 10, 202, { width: 120, height: 120 });
    doc.fillColor("#64748b").fontSize(9).text("Scan at entry gate", qrX, 340, { width: 140, align: "center" });

    doc
      .fillColor("#475569")
      .fontSize(10)
      .text(`Booking ID: ${ticket.booking}`, 70, 430)
      .text(`Generated: ${issuedAt}`, 70, 448)
      .text(`Status: ${ticket.status || "active"}`, 70, 466);

    doc
      .moveTo(50, 520)
      .lineTo(doc.page.width - 50, 520)
      .lineWidth(1)
      .strokeColor("#e2e8f0")
      .stroke();

    doc
      .fillColor("#64748b")
      .fontSize(9)
      .text("Please carry a valid ID proof along with this ticket. Enjoy your show.", 50, 532, {
        width: doc.page.width - 100,
        align: "center",
      });

    doc.end();
  });

  return fullPath;
};

const pruneOldTicketFiles = async () => {
  await ensureTicketsDir();
  const files = await fs.readdir(ticketsDir);
  const ticketFiles = files.filter((file) => file.endsWith(".pdf"));
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

const ensurePdfTicketFile = async (ticketDoc) => {
  if (!ticketDoc) {
    throw new ApiError(404, "Ticket not found");
  }

  const qrUpdated = await ensureSignedQrData(ticketDoc);
  const currentPath = ticketDoc.filePath ? path.resolve(ticketDoc.filePath) : null;
  if (!qrUpdated && currentPath && currentPath.toLowerCase().endsWith(".pdf")) {
    try {
      await fs.access(currentPath);
      return currentPath;
    } catch {
      // Continue to regenerate the ticket file.
    }
  }

  const filePath = await writeTicketFile(ticketDoc);
  if (ticketDoc.filePath !== filePath) {
    ticketDoc.filePath = filePath;
    await ticketDoc.save();
  }

  return path.resolve(filePath);
};

module.exports = {
  createOrUpdateTicketForBooking,
  ensurePdfTicketFile,
  buildSeatLabels,
};
