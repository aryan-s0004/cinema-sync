const express = require('express');
const router = express.Router();
const { getAllShows, getShowById, createShow, deleteShow } = require('../controllers/showController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', getAllShows);
router.get('/:id', getShowById);
router.post('/', protect, adminOnly, createShow);
router.delete('/:id', protect, adminOnly, deleteShow);

module.exports = router;
