import { useCallback, useMemo, useState } from "react";
import { AppContext } from "./AppContextObject";

const WATCHLIST_KEY = "watchlist";
const getMovieId = (movie) => movie?._id || movie?.tmdbId;

const parseStored = () => {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const AppProvider = ({ children }) => {
  const [watchlist, setWatchlist] = useState(parseStored);

  const addToWatchlist = useCallback((movie) => {
    const id = getMovieId(movie);
    if (!id) return;
    setWatchlist((current) => {
      if (current.some((item) => getMovieId(item) === id)) return current;
      const next = [...current, movie];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFromWatchlist = useCallback((movieId) => {
    setWatchlist((current) => {
      const next = current.filter((movie) => getMovieId(movie) !== movieId);
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isInWatchlist = useCallback(
    (movieId) => watchlist.some((movie) => getMovieId(movie) === movieId),
    [watchlist]
  );

  const value = useMemo(
    () => ({
      watchlist,
      addToWatchlist,
      removeFromWatchlist,
      isInWatchlist,
    }),
    [watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
