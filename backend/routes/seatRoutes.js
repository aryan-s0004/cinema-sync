const express = require('express');
const router = express.Router();
const { getSeatsByShow, lockSeats, suggestSeats } = require('../controllers/seatController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const validateRequest = require("../middleware/validateRequest");
const { showIdParamValidator, seatLockValidator, seatSuggestionValidator } = require("../validators/bookingValidators");

router.get('/:showId', optionalProtect, validateRequest({ params: showIdParamValidator }), getSeatsByShow);
router.post('/lock', protect, validateRequest({ body: seatLockValidator }), lockSeats);
router.post('/suggest', protect, validateRequest({ body: seatSuggestionValidator }), suggestSeats);

module.exports = router;
