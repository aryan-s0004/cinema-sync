import { useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import useDebounce from "../hooks/useDebounce";
import useMovies from "../hooks/useMovies";
import MovieGrid from "../components/movie/MovieGrid";
import Input from "../components/ui/Input";

const SearchPage = () => {
  const [params, setParams] = useSearchParams();
  const initialQuery = params.get("q") || "";
  const [query, setQuery] = useState(initialQuery);

  const debouncedQuery = useDebounce(query, 350);
  const { watchlist, isInWatchlist, addToWatchlist, removeFromWatchlist } = useContext(AppContext);
  const { filteredMovies, loading, error } = useMovies({ type: "all", query: debouncedQuery });

  useEffect(() => {
    if (debouncedQuery.trim()) {
      setParams({ q: debouncedQuery.trim() });
    } else {
      setParams({});
    }
  }, [debouncedQuery, setParams]);

  const watchlistIds = useMemo(() => watchlist.map((movie) => movie._id || movie.tmdbId), [watchlist]);

  const toggleWatchlist = (movie) => {
    const movieId = movie?._id || movie?.tmdbId;
    if (!movieId) return;
    if (isInWatchlist(movieId)) {
      removeFromWatchlist(movieId);
    } else {
      addToWatchlist(movie);
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold text-white">Search Movies</h1>
        <Input
          placeholder="Type movie title..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </section>

      {error ? <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-300">{error}</p> : null}

      <MovieGrid
        movies={filteredMovies}
        loading={loading}
        emptyText="No movies match your search."
        watchlistIds={watchlistIds}
        onToggleWatchlist={toggleWatchlist}
      />
    </div>
  );
};

export default SearchPage;
