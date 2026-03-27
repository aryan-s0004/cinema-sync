import { createContext, useMemo, useState } from "react";

export const AppContext = createContext(null);

const WATCHLIST_KEY = "watchlist";
const getMovieId = (movie) => movie?._id || movie?.tmdbId;

const parseStored = () => {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
};

export const AppProvider = ({ children }) => {
  const [watchlist, setWatchlist] = useState(parseStored);
  const [recommendMood, setRecommendMood] = useState("excited");

  const saveWatchlist = (next) => {
    setWatchlist(next);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
  };

  const addToWatchlist = (movie) => {
    const id = getMovieId(movie);
    if (!id) return;
    if (watchlist.some((item) => getMovieId(item) === id)) return;
    saveWatchlist([...watchlist, movie]);
  };

  const removeFromWatchlist = (movieId) => {
    saveWatchlist(watchlist.filter((movie) => getMovieId(movie) !== movieId));
  };

  const isInWatchlist = (movieId) => watchlist.some((movie) => getMovieId(movie) === movieId);

  const value = useMemo(
    () => ({
      watchlist,
      recommendMood,
      setRecommendMood,
      addToWatchlist,
      removeFromWatchlist,
      isInWatchlist
    }),
    [watchlist, recommendMood]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
