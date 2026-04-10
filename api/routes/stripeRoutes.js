const express = require("express");
const {
  initiatePayment,
  requestPaymentOtp,
  confirmPayment,
  getPaymentStatus,
  handleMockWebhook,
  handlePaymentWebhook,
} = require("../controllers/stripeController");
const { protect } = require("../middleware/authMiddleware");

const validateRequest = require("../middleware/validateRequest");
const {
  initiatePaymentValidator,
  paymentOtpRequestValidator,
  confirmPaymentValidator,
  paymentStatusParamValidator,
  paymentWebhookValidator,
} = require("../validators/stripeValidators");

const router = express.Router();

/**
 * STRIPE GATEWAY ROUTES (CINEMASYNC PREMIUM)
 * Supporting: Card (VISA/MC), UPI (Success @stripe), NETBANKING
 */

// Webhook for async success (MUST BE EXEMPT FROM AUTH)
router.post("/webhook/stripe", handlePaymentWebhook);
router.post("/webhook/mock", validateRequest({ body: paymentWebhookValidator }), handleMockWebhook);

// Payment Initiation (Stripe Intent)
router.post("/initiate", protect, validateRequest({ body: initiatePaymentValidator }), initiatePayment);
router.post("/request-otp", protect, validateRequest({ body: paymentOtpRequestValidator }), requestPaymentOtp);
router.post("/confirm", protect, validateRequest({ body: confirmPaymentValidator }), confirmPayment);

// Polling for status synchronization
router.get("/status/:transactionId", protect, validateRequest({ params: paymentStatusParamValidator }), getPaymentStatus);

// Backward Compatibility Aliases
router.post("/create-order", protect, validateRequest({ body: initiatePaymentValidator }), initiatePayment);
router.post("/verify", protect, validateRequest({ body: confirmPaymentValidator }), confirmPayment);

module.exports = router;
