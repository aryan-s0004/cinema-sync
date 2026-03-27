const express = require("express");
const { recommendMovies } = require("../controllers/recommendController");
const validateRequest = require("../middleware/validateRequest");
const { recommendValidator } = require("../validators/recommendTicketValidators");

const router = express.Router();

router.post("/", validateRequest({ body: recommendValidator }), recommendMovies);

module.exports = router;
