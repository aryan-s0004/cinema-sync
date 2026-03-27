const express = require('express');
const router = express.Router();
const { getSeatsByShow, lockSeats } = require('../controllers/seatController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require("../middleware/validateRequest");
const { showIdParamValidator, seatLockValidator } = require("../validators/bookingValidators");

router.get('/:showId', validateRequest({ params: showIdParamValidator }), getSeatsByShow);
router.post('/lock', protect, validateRequest({ body: seatLockValidator }), lockSeats);

module.exports = router;
