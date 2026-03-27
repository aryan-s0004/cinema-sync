const express = require("express");
const {
  getMyTickets,
  getTicketByBooking,
  downloadTicketFile,
} = require("../controllers/ticketController");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  ticketPaginationValidator,
  ticketBookingParamValidator,
  ticketCodeParamValidator,
} = require("../validators/recommendTicketValidators");

const router = express.Router();

router.get("/my", protect, validateRequest({ query: ticketPaginationValidator }), getMyTickets);
router.get("/booking/:bookingId", protect, validateRequest({ params: ticketBookingParamValidator }), getTicketByBooking);
router.get("/download/:ticketCode", protect, validateRequest({ params: ticketCodeParamValidator }), downloadTicketFile);

module.exports = router;
