import { useCallback, useMemo } from "react";
import useFetch from "./useFetch";
import { movieApi } from "../api/movies";

const useMovies = ({ type = "trending", query = "", includeRecommendations = false, mood = "excited" } = {}) => {
  const fetcher = useCallback(() => {
    if (type === "all") return movieApi.all();
    return movieApi.trending();
  }, [type]);

  const { data, loading, error, refetch } = useFetch(fetcher, [fetcher]);

  const movies = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const filteredMovies = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return movies;
    return movies.filter((movie) => movie.title?.toLowerCase().includes(normalized));
  }, [movies, query]);

  const recommendationFetcher = useCallback(() => movieApi.recommend({ mood }), [mood]);

  const {
    data: recommendationData,
    loading: recLoading,
    error: recError,
    refetch: refetchRecommendations
  } = useFetch(recommendationFetcher, [recommendationFetcher], { immediate: includeRecommendations });

  return {
    movies,
    filteredMovies,
    loading,
    error,
    refetch,
    recommendations: recommendationData?.recommendations || [],
    selectedGenre: recommendationData?.selectedGenre || "",
    recLoading,
    recError,
    refetchRecommendations
  };
};

export default useMovies;
