import { useCallback } from "react";
import useFetch from "./useFetch";
import { movieApi } from "../api/movies";

const useShows = (movieId) => {
  const fetchShows = useCallback(() => {
    if (!movieId) return Promise.resolve([]);
    return movieApi.showsByMovie(movieId);
  }, [movieId]);

  const { data, loading, error, refetch } = useFetch(fetchShows, [fetchShows], { immediate: Boolean(movieId) });

  return {
    shows: Array.isArray(data) ? data : [],
    loading,
    error,
    refetch
  };
};

export default useShows;
