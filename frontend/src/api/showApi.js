import api from "./axiosInstance";

export const getShowsByMovie = async (movieId) => {
  const { data } = await api.get(`/shows?movieId=${movieId}`);
  return data.data;
};

export const getShowById = async (showId) => {
  const { data } = await api.get(`/shows/${showId}`);
  return data.data;
};
