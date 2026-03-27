const path = require("path");
const fs = require("fs/promises");
const Ticket = require("../models/Ticket");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { parsePositiveInt } = require("../validators/common");

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
    const ticket = await Ticket.findOne({ ticketCode: req.params.ticketCode, user: req.user._id }).lean();
    if (!ticket) {
      throw new ApiError(404, "Ticket not found");
    }

    if (!ticket.filePath) {
      throw new ApiError(404, "Ticket file not found");
    }

    await fs.access(ticket.filePath);
    res.download(path.resolve(ticket.filePath));
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(404, "Ticket file not available"));
  }
};

module.exports = {
  getMyTickets,
  getTicketByBooking,
  downloadTicketFile,
};
