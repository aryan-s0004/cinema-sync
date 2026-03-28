const express = require("express");
const {
  getMyTickets,
  getTicketByBooking,
  downloadTicketFile,
  validateTicketScan,
} = require("../controllers/ticketController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  ticketPaginationValidator,
  ticketBookingParamValidator,
  ticketCodeParamValidator,
  ticketScanValidator,
} = require("../validators/recommendTicketValidators");

const router = express.Router();

router.get("/my", protect, validateRequest({ query: ticketPaginationValidator }), getMyTickets);
router.get("/booking/:bookingId", protect, validateRequest({ params: ticketBookingParamValidator }), getTicketByBooking);
router.get("/download/:ticketCode", protect, validateRequest({ params: ticketCodeParamValidator }), downloadTicketFile);
router.post("/scan/validate", protect, adminOnly, validateRequest({ body: ticketScanValidator }), validateTicketScan);

module.exports = router;
