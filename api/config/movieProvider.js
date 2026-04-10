const { apiKeys } = require("./apiKeys");

const provider = String(
  process.env.MOVIE_PROVIDER ||
    (process.env.WATCHMODE_API_KEY ? "watchmode" : process.env.TMDB_API_KEY ? "tmdb" : "database")
)
  .trim()
  .toLowerCase();

const defaultBaseUrls = {
  watchmode: "https://api.watchmode.com/v1",
  tmdb: "https://api.themoviedb.org/3",
  omdb: "https://www.omdbapi.com",
};

module.exports = Object.freeze({
  provider,
  apiKey: apiKeys.movieApiKey,
  apiUrl: String(process.env.MOVIE_API_URL || defaultBaseUrls[provider] || "").trim(),
  timeoutMs: Math.max(Number(process.env.MOVIE_API_TIMEOUT_MS || 10000), 1000),
});
