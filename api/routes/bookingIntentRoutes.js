const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  upsertBookingIntent,
  getActiveBookingIntent,
  closeBookingIntent,
} = require("../controllers/bookingIntentController");
const {
  bookingIntentBodyValidator,
  bookingIntentQueryValidator,
  bookingIntentParamValidator,
} = require("../validators/bookingIntentValidators");

const router = express.Router();

router.post("/", protect, validateRequest({ body: bookingIntentBodyValidator }), upsertBookingIntent);
router.get("/active", protect, validateRequest({ query: bookingIntentQueryValidator }), getActiveBookingIntent);
router.patch("/:id/close", protect, validateRequest({ params: bookingIntentParamValidator }), closeBookingIntent);

module.exports = router;
