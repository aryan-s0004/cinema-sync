const express = require('express');
const router = express.Router();
const { createBooking, getMyBookings, getBookingById, getBookingQuote, cancelBooking } = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require("../middleware/validateRequest");
const { seatLockValidator, paginationValidator, bookingIdParamValidator } = require("../validators/bookingValidators");

router.post('/', protect, validateRequest({ body: seatLockValidator }), createBooking);
router.get('/my', protect, validateRequest({ query: paginationValidator }), getMyBookings);
router.get('/:id/quote', protect, validateRequest({ params: bookingIdParamValidator }), getBookingQuote);
router.get('/:id', protect, validateRequest({ params: bookingIdParamValidator }), getBookingById);
router.patch('/:id/cancel', protect, validateRequest({ params: bookingIdParamValidator }), cancelBooking);

module.exports = router;
