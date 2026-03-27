const express = require("express");
const {
  initiatePayment,
  requestPaymentOtp,
  confirmPayment,
  getPaymentStatus,
  createPaymentOrder,
  verifyPayment,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  createOrderValidator,
  verifyPaymentValidator,
  initiatePaymentValidator,
  paymentOtpRequestValidator,
  confirmPaymentValidator,
  paymentStatusParamValidator,
} = require("../validators/paymentValidators");

const router = express.Router();

router.post("/initiate", protect, validateRequest({ body: initiatePaymentValidator }), initiatePayment);
router.post("/request-otp", protect, validateRequest({ body: paymentOtpRequestValidator }), requestPaymentOtp);
router.post("/confirm", protect, validateRequest({ body: confirmPaymentValidator }), confirmPayment);
router.get("/status/:transactionId", protect, validateRequest({ params: paymentStatusParamValidator }), getPaymentStatus);

// Backward-compatible legacy endpoints
router.post("/create-order", protect, validateRequest({ body: createOrderValidator }), createPaymentOrder);
router.post("/verify", protect, validateRequest({ body: verifyPaymentValidator }), verifyPayment);

module.exports = router;
