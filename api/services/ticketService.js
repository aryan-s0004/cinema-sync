const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const Ticket = require("../models/Ticket");
const ApiError = require("../utils/ApiError");
const { buildSignedQrData } = require("./ticketSecurityService");

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

const buildPdfTicketBuffer = async (ticket) => {
  const qrBuffer = await QRCode.toBuffer(String(ticket.qrData || ticket.ticketCode), {
    type: "png",
    width: 300,
    margin: 1,
  });
  const issuedAt = formatTicketDate(ticket.issuedAt || new Date());
  const showTime = formatTicketDate(ticket.showTime);
  const seats = Array.isArray(ticket.seatLabels) && ticket.seatLabels.length ? ticket.seatLabels.join(", ") : "N/A";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];

    doc.on("error", reject);
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

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
};

const createOrUpdateTicketForBooking = async (bookingDoc, userDoc) => {
  const existing = await Ticket.findOne({ booking: bookingDoc._id, user: userDoc._id });
  const ticketCode = existing?.ticketCode || makeTicketCode(bookingDoc._id);

  const payload = buildTicketPayload(bookingDoc, userDoc, ticketCode);

  const ticket = await Ticket.findOneAndUpdate(
    { booking: bookingDoc._id, user: userDoc._id },
    { $set: { ...payload, filePath: null } },
    { upsert: true, returnDocument: "after", runValidators: true }
  );

  if (ticket.filePath !== null) {
    ticket.filePath = null;
    await ticket.save();
  }

  return ticket;
};

const generatePdfTicketBuffer = async (ticketDoc) => {
  if (!ticketDoc) {
    throw new ApiError(404, "Ticket not found");
  }

  await ensureSignedQrData(ticketDoc);
  if (ticketDoc.filePath !== null) {
    ticketDoc.filePath = null;
    await ticketDoc.save();
  }

  return buildPdfTicketBuffer(ticketDoc);
};

module.exports = {
  createOrUpdateTicketForBooking,
  generatePdfTicketBuffer,
  buildSeatLabels,
};
