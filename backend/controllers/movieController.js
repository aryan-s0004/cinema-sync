const Movie = require("../models/Movie");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { fetchPopularMovies, fetchMovieDetails, mapTmdbMovie } = require("../services/tmdbService");

const getAllMovies = async (_req, res, next) => {
  try {
    const movies = await Movie.find({ isActive: true }).sort({ popularity: -1, createdAt: -1 });
    res.json(new ApiResponse(200, movies, "Movies fetched"));
  } catch (error) {
    next(error);
  }
};

const getTrendingMovies = async (_req, res, next) => {
  try {
    if (!process.env.TMDB_API_KEY) {
      const fallback = await Movie.find({ isActive: true }).sort({ popularity: -1, createdAt: -1 }).limit(20);
      return res.json(new ApiResponse(200, fallback, "TMDB key missing, returning DB movies"));
    }

    const tmdbMovies = await fetchPopularMovies();
    if (!tmdbMovies.length) {
      const fallback = await Movie.find({ isActive: true }).sort({ popularity: -1, createdAt: -1 }).limit(20);
      return res.json(new ApiResponse(200, fallback, "TMDB empty, returning DB movies"));
    }

    await Movie.bulkWrite(
      tmdbMovies.map((movie) => ({
        updateOne: {
          filter: { tmdbId: movie.tmdbId },
          update: { $set: movie },
          upsert: true,
        },
      })),
      { ordered: false }
    );

    const movies = await Movie.find({
      tmdbId: { $in: tmdbMovies.map((movie) => movie.tmdbId) },
      isActive: true,
    }).sort({ popularity: -1 });

    return res.json(new ApiResponse(200, movies, "Trending movies fetched"));
  } catch (error) {
    next(error);
  }
};

const getMovieById = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) throw new ApiError(404, "Movie not found");

    if (movie.tmdbId && process.env.TMDB_API_KEY) {
      try {
        const details = await fetchMovieDetails(movie.tmdbId);
        Object.assign(movie, mapTmdbMovie(details));
        await movie.save();
      } catch (_err) {
        // Non-blocking; serve DB value.
      }
    }

    res.json(new ApiResponse(200, movie, "Movie fetched"));
  } catch (error) {
    next(error);
  }
};

const createMovie = async (req, res, next) => {
  try {
    const movie = await Movie.create(req.body);
    res.status(201).json(new ApiResponse(201, movie, "Movie created"));
  } catch (error) {
    next(error);
  }
};

const updateMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!movie) throw new ApiError(404, "Movie not found");
    res.json(new ApiResponse(200, movie, "Movie updated"));
  } catch (error) {
    next(error);
  }
};

const deleteMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!movie) throw new ApiError(404, "Movie not found");
    res.json(new ApiResponse(200, null, "Movie deactivated"));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllMovies,
  getTrendingMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
};
