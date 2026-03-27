const express = require('express');
const router = express.Router();
const { getAllShows, getShowById, createShow, deleteShow } = require('../controllers/showController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const validateRequest = require("../middleware/validateRequest");
const { showListQueryValidator, showIdParamValidator, showCreateValidator } = require("../validators/showValidators");

router.get('/', validateRequest({ query: showListQueryValidator }), getAllShows);
router.get('/:id', validateRequest({ params: showIdParamValidator }), getShowById);
router.post('/', protect, adminOnly, validateRequest({ body: showCreateValidator }), createShow);
router.delete('/:id', protect, adminOnly, validateRequest({ params: showIdParamValidator }), deleteShow);

module.exports = router;
