const express = require("express");
const {
  getAllMovies,
  getTrendingMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
} = require("../controllers/movieController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  movieQueryValidator,
  movieIdParamValidator,
  movieCreateValidator,
  movieUpdateValidator,
} = require("../validators/movieValidators");

const router = express.Router();

router.get("/", validateRequest({ query: movieQueryValidator }), getAllMovies);
router.get("/trending", validateRequest({ query: movieQueryValidator }), getTrendingMovies);
router.get("/:id", validateRequest({ params: movieIdParamValidator }), getMovieById);
router.post("/", protect, adminOnly, validateRequest({ body: movieCreateValidator }), createMovie);
router.put(
  "/:id",
  protect,
  adminOnly,
  validateRequest({ params: movieIdParamValidator, body: movieUpdateValidator }),
  updateMovie
);
router.delete("/:id", protect, adminOnly, validateRequest({ params: movieIdParamValidator }), deleteMovie);

module.exports = router;
