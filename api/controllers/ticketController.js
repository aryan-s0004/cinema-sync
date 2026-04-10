const Ticket = require("../models/Ticket");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { parsePositiveInt } = require("../validators/common");
const { generatePdfTicketBuffer } = require("../services/ticketService");
const {
  verifySignedQrData,
  getScanWindow,
  SCAN_OPEN_MINUTES_BEFORE,
  SCAN_CLOSE_MINUTES_AFTER,
} = require("../services/ticketSecurityService");

const getMyTickets = async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      Ticket.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Ticket.countDocuments({ user: req.user._id }),
    ]);

    res.json(
      new ApiResponse(200, tickets, "Tickets fetched", {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      })
    );
  } catch (error) {
    next(error);
  }
};

const getTicketByBooking = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ booking: req.params.bookingId, user: req.user._id }).lean();
    if (!ticket) {
      throw new ApiError(404, "Ticket not found for this booking");
    }

    res.json(new ApiResponse(200, ticket, "Ticket fetched"));
  } catch (error) {
    next(error);
  }
};

const downloadTicketFile = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ ticketCode: req.params.ticketCode, user: req.user._id });
    if (!ticket) {
      throw new ApiError(404, "Ticket not found");
    }

    const pdfBuffer = await generatePdfTicketBuffer(ticket);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${ticket.ticketCode}.pdf\"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(404, "Ticket file could not be generated"));
  }
};

const formatScanDate = (value) =>
  new Date(value).toLocaleString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

const validateTicketScan = async (req, res, next) => {
  try {
    const { qrData, consume, gate, deviceId } = req.body;
    const { claims } = verifySignedQrData(qrData);

    const ticket = await Ticket.findOne({ ticketCode: claims.tc });
    if (!ticket) {
      throw new ApiError(404, "Ticket not found");
    }

    if (String(ticket.booking) !== String(claims.bid) || String(ticket.user) !== String(claims.uid)) {
      throw new ApiError(401, "Ticket signature mismatch");
    }

    if (ticket.status !== "active") {
      throw new ApiError(400, "Ticket is not active");
    }

    const { openAt, closeAt } = getScanWindow(ticket.showTime);
    const now = new Date();

    if (now.getTime() < openAt.getTime()) {
      throw new ApiError(400, `Entry opens ${SCAN_OPEN_MINUTES_BEFORE} min before show (${formatScanDate(openAt)})`);
    }

    if (now.getTime() > closeAt.getTime()) {
      throw new ApiError(400, `Ticket entry window is closed (ended at ${formatScanDate(closeAt)})`);
    }

    if (ticket.scan?.used) {
      await Ticket.updateOne(
        { _id: ticket._id },
        {
          $inc: { "scan.scanCount": 1 },
          $set: {
            "scan.lastScannedAt": now,
            "scan.lastScanResult": "duplicate",
            "scan.gate": gate || ticket.scan?.gate || null,
            "scan.deviceId": deviceId || ticket.scan?.deviceId || null,
          },
        }
      );

      throw new ApiError(409, `Ticket already used at ${formatScanDate(ticket.scan.usedAt)}`);
    }

    if (!consume) {
      return res.json(
        new ApiResponse(
          200,
          {
            valid: true,
            consumed: false,
            ticketCode: ticket.ticketCode,
            movieTitle: ticket.movieTitle,
            showTime: ticket.showTime,
            seatLabels: ticket.seatLabels,
            status: ticket.status,
            window: { openAt, closeAt, closeAfterMinutes: SCAN_CLOSE_MINUTES_AFTER },
          },
          "Ticket is valid for entry"
        )
      );
    }

    const consumedTicket = await Ticket.findOneAndUpdate(
      { _id: ticket._id, "scan.used": { $ne: true }, status: "active" },
      {
        $inc: { "scan.scanCount": 1 },
        $set: {
          "scan.used": true,
          "scan.usedAt": now,
          "scan.usedBy": req.user._id,
          "scan.lastScannedAt": now,
          "scan.lastScanResult": "accepted",
          "scan.gate": gate || null,
          "scan.deviceId": deviceId || null,
        },
      },
      { returnDocument: "after" }
    ).lean();

    if (!consumedTicket) {
      const latest = await Ticket.findById(ticket._id).lean();
      const usedAt = latest?.scan?.usedAt ? formatScanDate(latest.scan.usedAt) : "recently";
      throw new ApiError(409, `Ticket already used at ${usedAt}`);
    }

    return res.json(
      new ApiResponse(
        200,
        {
          valid: true,
          consumed: true,
          ticketCode: consumedTicket.ticketCode,
          movieTitle: consumedTicket.movieTitle,
          showTime: consumedTicket.showTime,
          seatLabels: consumedTicket.seatLabels,
          scannedAt: consumedTicket.scan?.usedAt,
          scanCount: consumedTicket.scan?.scanCount || 1,
        },
        "Entry allowed"
      )
    );
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return next(new ApiError(400, "Ticket QR expired for entry window"));
    }

    if (error?.name === "NotBeforeError") {
      return next(new ApiError(400, "Ticket QR is not active yet for scanning"));
    }

    return next(error instanceof ApiError ? error : new ApiError(400, error.message || "Ticket validation failed"));
  }
};

module.exports = {
  getMyTickets,
  getTicketByBooking,
  downloadTicketFile,
  validateTicketScan,
};
