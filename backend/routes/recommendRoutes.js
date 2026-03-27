const express = require("express");
const { recommendMovies } = require("../controllers/recommendController");

const router = express.Router();

router.post("/", recommendMovies);

module.exports = router;
