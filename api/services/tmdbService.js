const axios = require("axios");
const ApiError = require("../utils/ApiError");

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const genreMap = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  "Science Fiction": 878,
  TV: 10770,
  Thriller: 53,
  War: 10752,
  Western: 37,
};

const ensureApiKey = () => {
  if (!process.env.TMDB_API_KEY) {
    throw new ApiError(500, "TMDB_API_KEY is missing");
  }
};

const mapTmdbMovie = (movie) => ({
  tmdbId: movie.id,
  title: movie.title,
  overview: movie.overview || "",
  language: movie.original_language || "en",
  releaseDate: movie.release_date ? new Date(movie.release_date) : null,
  rating: movie.vote_average || 0,
  posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : "",
  backdropPath: movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : "",
  popularity: movie.popularity || 0,
  isActive: true,
});

const tmdb = axios.create({
  baseURL: TMDB_BASE_URL,
  timeout: 10000,
});

const requestTmdb = async (path, params = {}) => {
  ensureApiKey();

  try {
    const { data } = await tmdb.get(path, {
      params: {
        api_key: process.env.TMDB_API_KEY,
        ...params,
      },
    });
    return data;
  } catch (error) {
    const status = error.response?.status || 500;
    throw new ApiError(status, "TMDB request failed");
  }
};

const fetchPopularMovies = async (page = 1) => {
  const data = await requestTmdb("/movie/popular", { page });
  return (data.results || []).map(mapTmdbMovie);
};

const fetchMovieDetails = async (tmdbId) => {
  return requestTmdb(`/movie/${tmdbId}`);
};

const discoverMoviesByGenreName = async (genreName, page = 1) => {
  const normalized = Object.keys(genreMap).find(
    (name) => name.toLowerCase() === String(genreName || "").toLowerCase()
  );
  const genreId = normalized ? genreMap[normalized] : genreMap.Action;

  const data = await requestTmdb("/discover/movie", {
    with_genres: genreId,
    sort_by: "popularity.desc",
    page,
  });

  return (data.results || []).map(mapTmdbMovie);
};

module.exports = {
  fetchPopularMovies,
  fetchMovieDetails,
  discoverMoviesByGenreName,
  mapTmdbMovie,
};
