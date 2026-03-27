import api from "./client";

const normalizeMovieArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const memoryCache = new Map();
const CACHE_TTL_MS = 45_000;

const cacheGet = (key) => {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
};

const cacheSet = (key, data, ttl = CACHE_TTL_MS) => {
  memoryCache.set(key, { data, expiresAt: Date.now() + ttl });
};

export const movieApi = {
  trending: async () => {
    const cacheKey = "movies:trending";
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
    const res = await api.get("/movies/trending");
    const data = normalizeMovieArray(res.data?.data);
    cacheSet(cacheKey, data);
    return data;
  },
  all: async () => {
    const cacheKey = "movies:all";
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
    const res = await api.get("/movies");
    const data = normalizeMovieArray(res.data?.data);
    cacheSet(cacheKey, data);
    return data;
  },
  details: async (movieId) => (await api.get(`/movies/${movieId}`)).data.data,
  showsByMovie: async (movieId) => {
    const res = await api.get(`/shows?movieId=${movieId}`);
    return normalizeMovieArray(res.data?.data);
  },
  recommend: async (payload) => {
    const cacheKey = `recommend:${JSON.stringify(payload || {})}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
    const data = (await api.post("/recommend", payload)).data.data;
    cacheSet(cacheKey, data, 30_000);
    return data;
  }
};
