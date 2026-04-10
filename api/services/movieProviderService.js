const axios = require("axios");
const Movie = require("../models/Movie");
const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");
const movieProviderConfig = require("../config/movieProvider");
const { fetchPopularMovies, fetchMovieDetails, mapTmdbMovie } = require("./tmdbService");

const watchmode = axios.create({
  baseURL: movieProviderConfig.apiUrl,
  timeout: movieProviderConfig.timeoutMs,
});

const normalizeTextArray = (...values) =>
  values
    .flat()
    .filter(Boolean)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value).trim())
    .filter(Boolean);

const normalizeDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const absoluteImage = (value, fallbackBase = "") => {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (!fallbackBase) return url;
  return `${fallbackBase.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
};

const mapWatchmodeMovie = (movie = {}) => ({
  providerSource: "watchmode",
  providerMovieId: String(
    movie.id ||
      movie.title_id ||
      movie.watchmode_id ||
      movie.tmdb_id ||
      movie.imdb_id ||
      movie.movie_id ||
      ""
  ),
  title: movie.title || movie.name || "Untitled",
  overview: movie.plot_overview || movie.overview || movie.description || "",
  language: movie.original_language || movie.language || movie.original_language_name || "en",
  duration: Number(movie.runtime_minutes || movie.runtime || movie.runtime_mins || 120),
  releaseDate: normalizeDate(movie.release_date || movie.first_release_date || movie.year),
  rating: Number(movie.user_rating || movie.tmdb_rating || movie.imdb_rating || movie.critic_score || 0),
  genres: normalizeTextArray(movie.genre_names, movie.genres, movie.genre_slugs),
  posterPath: absoluteImage(movie.poster || movie.poster_url || movie.poster_path, movieProviderConfig.apiUrl),
  backdropPath: absoluteImage(
    movie.backdrop || movie.backdrop_url || movie.backdrop_path || movie.hero_image,
    movieProviderConfig.apiUrl
  ),
  popularity: Number(movie.relevance_percentile || movie.popularity || movie.rank || 0),
  isActive: true,
});

const fetchWatchmodeTrending = async (page = 1, limit = 20) => {
  if (!movieProviderConfig.apiKey) {
    throw new ApiError(500, "MOVIE_API_KEY is missing for Watchmode provider");
  }

  const { data } = await watchmode.get("/list-titles/", {
    params: {
      apiKey: movieProviderConfig.apiKey,
      types: "movie",
      page,
      limit,
      sort_by: "popularity_desc",
    },
  });

  const items =
    data?.titles ||
    data?.title_results ||
    data?.results ||
    data?.items ||
    data?.movies ||
    data?.data ||
    [];
  return items.map(mapWatchmodeMovie).filter((movie) => movie.providerMovieId && movie.title);
};

const fetchWatchmodeDetails = async (providerMovieId) => {
  if (!movieProviderConfig.apiKey) {
    throw new ApiError(500, "MOVIE_API_KEY is missing for Watchmode provider");
  }

  const { data } = await watchmode.get(`/title/${providerMovieId}/details/`, {
    params: { apiKey: movieProviderConfig.apiKey, append_to_response: "sources" },
  });

  return mapWatchmodeMovie(data || {});
};

const ensureMovieCatalog = async ({ minimumCount = 12, pages = 2, perPage = 20 } = {}) => {
  const activeCount = await Movie.countDocuments({ isActive: true });
  if (activeCount >= minimumCount) {
    return activeCount;
  }

  const provider = getProvider();
  if (!provider.fetchTrending || movieProviderConfig.provider === "database") {
    return activeCount;
  }

  let hydratedCount = activeCount;
  for (let page = 1; page <= pages && hydratedCount < minimumCount; page += 1) {
    try {
      const movies = await provider.fetchTrending(page, perPage);
      if (!movies.length) break;
      await syncProviderMovies(movies);
      hydratedCount = await Movie.countDocuments({ isActive: true });
    } catch (error) {
      logger.warn("Movie catalog hydration failed", {
        provider: movieProviderConfig.provider,
        page,
        message: error.message,
      });
      break;
    }
  }

  return hydratedCount;
};

const providerHandlers = {
  database: {
    async fetchTrending(page, limit) {
      const skip = Math.max(page - 1, 0) * limit;
      return Movie.find({ isActive: true }).sort({ popularity: -1, createdAt: -1 }).skip(skip).limit(limit).lean();
    },
    async fetchDetails(movieDoc) {
      return movieDoc;
    },
  },
  tmdb: {
    async fetchTrending(page) {
      return fetchPopularMovies(page).map((movie) => ({
        ...movie,
        providerSource: "tmdb",
        providerMovieId: String(movie.tmdbId),
      }));
    },
    async fetchDetails(movieDoc) {
      if (!movieDoc?.tmdbId) {
        return movieDoc;
      }

      const details = await fetchMovieDetails(movieDoc.tmdbId);
      return {
        ...mapTmdbMovie(details),
        providerSource: "tmdb",
        providerMovieId: String(details.id || movieDoc.tmdbId),
      };
    },
  },
  watchmode: {
    fetchTrending: fetchWatchmodeTrending,
    async fetchDetails(movieDoc) {
      if (!movieDoc?.providerMovieId) {
        return movieDoc;
      }

      return fetchWatchmodeDetails(movieDoc.providerMovieId);
    },
  },
};

const getProvider = () => providerHandlers[movieProviderConfig.provider] || providerHandlers.database;

const syncProviderMovies = async (movies = []) => {
  const normalizedMovies = movies
    .filter((movie) => movie?.title)
    .map((movie) => ({
      ...movie,
      providerSource: movie.providerSource || movieProviderConfig.provider || "database",
      providerMovieId: movie.providerMovieId || null,
    }));

  if (!normalizedMovies.length) {
    return [];
  }

  const bulkOps = normalizedMovies.map((movie) => {
    const filter = movie.providerMovieId
      ? { providerSource: movie.providerSource, providerMovieId: movie.providerMovieId }
      : movie.tmdbId
        ? { tmdbId: movie.tmdbId }
        : { title: movie.title };

    return {
      updateOne: {
        filter,
        update: { $set: movie },
        upsert: true,
      },
    };
  });

  await Movie.bulkWrite(bulkOps, { ordered: false });

  const ids = normalizedMovies
    .filter((movie) => movie.providerMovieId)
    .map((movie) => ({ providerSource: movie.providerSource, providerMovieId: movie.providerMovieId }));

  if (ids.length) {
    return Movie.find({
      $or: ids,
      isActive: true,
    })
      .sort({ popularity: -1, createdAt: -1 })
      .lean();
  }

  return Movie.find({ title: { $in: normalizedMovies.map((movie) => movie.title) }, isActive: true })
    .sort({ popularity: -1, createdAt: -1 })
    .lean();
};

const fetchTrendingMovies = async ({ page = 1, limit = 20 }) => {
  const provider = getProvider();

  try {
    const movies = await provider.fetchTrending(page, limit);
    if (!movies.length) {
      return providerHandlers.database.fetchTrending(page, limit);
    }

    return syncProviderMovies(movies);
  } catch (error) {
    logger.warn("Movie provider fetch failed, falling back to database", {
      provider: movieProviderConfig.provider,
      message: error.message,
    });
    return providerHandlers.database.fetchTrending(page, limit);
  }
};

const refreshMovieDetails = async (movieDoc) => {
  const provider = getProvider();

  try {
    const details = await provider.fetchDetails(movieDoc);
    if (!details || details === movieDoc) {
      return movieDoc;
    }

    Object.assign(movieDoc, details);
    await movieDoc.save();
    return movieDoc;
  } catch (error) {
    logger.warn("Movie detail refresh skipped", {
      provider: movieProviderConfig.provider,
      movieId: String(movieDoc?._id || ""),
      message: error.message,
    });
    return movieDoc;
  }
};

module.exports = {
  fetchTrendingMovies,
  refreshMovieDetails,
  ensureMovieCatalog,
};
