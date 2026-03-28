const express = require("express");
const {
  initiatePayment,
  requestPaymentOtp,
  confirmPayment,
  getPaymentStatus,
  handlePaymentWebhook,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  initiatePaymentValidator,
  paymentOtpRequestValidator,
  confirmPaymentValidator,
  paymentStatusParamValidator,
  paymentWebhookValidator,
} = require("../validators/paymentValidators");

const router = express.Router();

// Provider callback endpoint (signature-verified, no user token).
router.post("/webhook/mock", validateRequest({ body: paymentWebhookValidator }), handlePaymentWebhook);
router.post("/initiate", protect, validateRequest({ body: initiatePaymentValidator }), initiatePayment);
router.post("/request-otp", protect, validateRequest({ body: paymentOtpRequestValidator }), requestPaymentOtp);
router.post("/confirm", protect, validateRequest({ body: confirmPaymentValidator }), confirmPayment);
router.get("/status/:transactionId", protect, validateRequest({ params: paymentStatusParamValidator }), getPaymentStatus);

module.exports = router;
