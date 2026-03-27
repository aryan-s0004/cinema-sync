const express = require("express");
const { createPaymentOrder, verifyPayment } = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const { createOrderValidator, verifyPaymentValidator } = require("../validators/paymentValidators");

const router = express.Router();

router.post("/create-order", protect, validateRequest({ body: createOrderValidator }), createPaymentOrder);
router.post("/verify", protect, validateRequest({ body: verifyPaymentValidator }), verifyPayment);

module.exports = router;
