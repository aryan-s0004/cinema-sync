const Movie = require("../models/Movie");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { fetchPopularMovies, fetchMovieDetails, mapTmdbMovie } = require("../services/tmdbService");
const { getCache, setCache, clearCache } = require("../services/cacheService");
const { parsePositiveInt } = require("../validators/common");

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
    const cacheKey = `movies:trending:${page}:${limit}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(new ApiResponse(200, cached, "Trending movies fetched (cached)"));
    }

    if (!process.env.TMDB_API_KEY) {
      const fallback = await Movie.find({ isActive: true }).sort({ popularity: -1, createdAt: -1 }).limit(limit).lean();
      setCache(cacheKey, fallback, 30_000);
      return res.json(new ApiResponse(200, fallback, "TMDB key missing, returning DB movies"));
    }

    try {
      const tmdbMovies = await fetchPopularMovies(page);
      if (!tmdbMovies.length) {
        const fallback = await Movie.find({ isActive: true }).sort({ popularity: -1, createdAt: -1 }).limit(limit).lean();
        setCache(cacheKey, fallback, 30_000);
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
      })
        .sort({ popularity: -1 })
        .limit(limit)
        .lean();

      setCache(cacheKey, movies, 60_000);
      return res.json(new ApiResponse(200, movies, "Trending movies fetched"));
    } catch (_tmdbError) {
      const fallback = await Movie.find({ isActive: true }).sort({ popularity: -1, createdAt: -1 }).limit(limit).lean();
      setCache(cacheKey, fallback, 30_000);
      return res.json(new ApiResponse(200, fallback, "TMDB unavailable, returning DB movies"));
    }
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
