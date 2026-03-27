import api from "./axiosInstance";

export const getTrendingMovies = async () => {
  const { data } = await api.get("/movies/trending");
  return data.data;
};

export const getMovieById = async (movieId) => {
  const { data } = await api.get(`/movies/${movieId}`);
  return data.data;
};
