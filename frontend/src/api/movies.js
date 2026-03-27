import api from "./client";

const normalizeMovieArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

export const movieApi = {
  trending: async () => {
    const res = await api.get("/movies/trending");
    return normalizeMovieArray(res.data?.data);
  },
  all: async () => {
    const res = await api.get("/movies");
    return normalizeMovieArray(res.data?.data);
  },
  details: async (movieId) => (await api.get(`/movies/${movieId}`)).data.data,
  showsByMovie: async (movieId) => {
    const res = await api.get(`/shows?movieId=${movieId}`);
    return normalizeMovieArray(res.data?.data);
  },
  recommend: async (payload) => (await api.post("/recommend", payload)).data.data
};
