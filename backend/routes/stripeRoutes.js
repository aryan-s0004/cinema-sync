const express = require("express");
const {
  initiatePayment,
  confirmPayment,
  getPaymentStatus,
  handlePaymentWebhook,
} = require("../controllers/stripeController");
const { protect } = require("../middleware/authMiddleware");

const validateRequest = require("../middleware/validateRequest");
const {
  initiatePaymentValidator,
  paymentStatusParamValidator,
} = require("../validators/stripeValidators");

const router = express.Router();

/**
 * STRIPE GATEWAY ROUTES (CINEMASYNC PREMIUM)
 * Supporting: Card (VISA/MC), UPI (Success @stripe), NETBANKING
 */

// Webhook for async success (MUST BE EXEMPT FROM AUTH)
router.post("/webhook/stripe", handlePaymentWebhook);

// Payment Initiation (Stripe Intent)
router.post("/initiate", protect, validateRequest(initiatePaymentValidator), initiatePayment);
router.post("/confirm", protect, confirmPayment);

// Polling for status synchronization
router.get("/status/:transactionId", protect, validateRequest(paymentStatusParamValidator, "params"), getPaymentStatus);

// Backward Compatibility Aliases
router.post("/create-order", protect, validateRequest(initiatePaymentValidator), initiatePayment);
router.post("/verify", protect, confirmPayment);

module.exports = router;
