import api from "./client";

const normalizeArray = (data) => (Array.isArray(data) ? data : []);

export const adminApi = {
  listMovies: async () => normalizeArray((await api.get("/movies?limit=100")).data.data),
  createMovie: async (payload) => (await api.post("/movies", payload)).data.data,
  updateMovie: async (movieId, payload) => (await api.put(`/movies/${movieId}`, payload)).data.data,
  deactivateMovie: async (movieId) => (await api.delete(`/movies/${movieId}`)).data.data,

  listShows: async () => normalizeArray((await api.get("/shows?limit=100")).data.data),
  createShow: async (payload) => (await api.post("/shows", payload)).data.data,
  cancelShow: async (showId) => (await api.delete(`/shows/${showId}`)).data.data,
};
