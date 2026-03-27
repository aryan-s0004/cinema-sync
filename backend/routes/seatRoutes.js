const express = require('express');
const router = express.Router();
const { getSeatsByShow, lockSeats } = require('../controllers/seatController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:showId', getSeatsByShow);
router.post('/lock', protect, lockSeats);

module.exports = router;
