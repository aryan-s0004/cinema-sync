const Movie = require("../models/Movie");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { getCache, setCache, clearCache } = require("../services/cacheService");
const { parsePositiveInt } = require("../validators/common");
const movieProviderConfig = require("../config/movieProvider");
const { fetchTrendingMovies, refreshMovieDetails } = require("../services/movieProviderService");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getAllMovies = async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const skip = (page - 1) * limit;
    const search = String(req.query.search || "").trim();

    const filter = { isActive: true };
    if (search) {
      filter.title = { $regex: escapeRegex(search), $options: "i" };
    }

    const [movies, total] = await Promise.all([
      Movie.find(filter).sort({ popularity: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Movie.countDocuments(filter),
    ]);

    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.json(
      new ApiResponse(200, movies, "Movies fetched", {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      })
    );
  } catch (error) {
    next(error);
  }
};

const getTrendingMovies = async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 20);
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    const cacheKey = `movies:trending:${page}:${limit}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(new ApiResponse(200, cached, "Trending movies fetched (cached)"));
    }

    const movies = await fetchTrendingMovies({ page, limit });
    const ttl = movieProviderConfig.provider === "database" ? 30_000 : 60_000;
    setCache(cacheKey, movies, ttl);
    return res.json(
      new ApiResponse(200, movies, `Trending movies fetched via ${movieProviderConfig.provider} provider`)
    );
  } catch (error) {
    next(error);
  }
};

const getMovieById = async (req, res, next) => {
  try {
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    const movie = await Movie.findById(req.params.id);
    if (!movie) throw new ApiError(404, "Movie not found");

    await refreshMovieDetails(movie);

    res.json(new ApiResponse(200, movie, "Movie fetched"));
  } catch (error) {
    next(error);
  }
};

const createMovie = async (req, res, next) => {
  try {
    const movie = await Movie.create(req.body);
    clearCache("movies:");
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
    clearCache("movies:");
    res.json(new ApiResponse(200, movie, "Movie updated"));
  } catch (error) {
    next(error);
  }
};

const deleteMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!movie) throw new ApiError(404, "Movie not found");
    clearCache("movies:");
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
