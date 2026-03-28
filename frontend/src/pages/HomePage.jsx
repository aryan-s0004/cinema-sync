import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useDebounce from "../hooks/useDebounce";
import useMovies from "../hooks/useMovies";
import HeroCarousel from "../components/movie/HeroCarousel";
import MovieRow from "../components/movie/MovieRow";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { AppContext } from "../context/AppContext";
import { AuthContext } from "../context/AuthContext";
import { bookingApi } from "../api/bookings";

const inferGenreFromQuery = (query) => {
  const normalized = String(query || "").toLowerCase();
  const map = [
    { key: "action", genre: "Action" },
    { key: "rom", genre: "Romance" },
    { key: "love", genre: "Romance" },
    { key: "horror", genre: "Horror" },
    { key: "thriller", genre: "Thriller" },
    { key: "comedy", genre: "Comedy" },
    { key: "family", genre: "Family" },
    { key: "sci", genre: "Science Fiction" },
  ];

  const match = map.find((item) => normalized.includes(item.key));
  return match?.genre || "Action";
};

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);
  const { watchlist, isInWatchlist, addToWatchlist, removeFromWatchlist } = useContext(AppContext);
  const [query, setQuery] = useState("");
  const [activeIntent, setActiveIntent] = useState(null);

  const debounced = useDebounce(query, 350);
  const recommendationPayload = useMemo(() => ({ genre: inferGenreFromQuery(debounced) }), [debounced]);
  const { movies, filteredMovies, loading, error, recommendations, recLoading, recError } = useMovies({
    type: "trending",
    query: debounced,
    includeRecommendations: true,
    recommendationPayload
  });

  const watchlistIds = useMemo(() => watchlist.map((movie) => movie._id || movie.tmdbId), [watchlist]);

  useEffect(() => {
    const loadIntent = async () => {
      if (!isAuthenticated) {
        setActiveIntent(null);
        return;
      }
      try {
        const intent = await bookingApi.getActiveBookingIntent();
        setActiveIntent(intent);
      } catch {
        setActiveIntent(null);
      }
    };

    loadIntent();
  }, [isAuthenticated]);

  const toggleWatchlist = (movie) => {
    const movieId = movie?._id || movie?.tmdbId;
    if (!movieId) return;
    if (isInWatchlist(movieId)) {
      removeFromWatchlist(movieId);
    } else {
      addToWatchlist(movie);
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const safeQuery = query.trim();
    if (!safeQuery) return;
    navigate(`/search?q=${encodeURIComponent(safeQuery)}`);
  };

  const visibleMovies = useMemo(() => {
    if (filteredMovies.length) return filteredMovies;
    return movies;
  }, [filteredMovies, movies]);

  const heroMovies = useMemo(() => visibleMovies.slice(0, 5), [visibleMovies]);
  const trendingMovies = useMemo(() => visibleMovies.slice(0, 14), [visibleMovies]);

  const topRatedMovies = useMemo(
    () => [...visibleMovies].sort((a, b) => Number(b?.rating || 0) - Number(a?.rating || 0)).slice(0, 14),
    [visibleMovies]
  );

  const recommendedMovies = useMemo(() => {
    if (Array.isArray(recommendations) && recommendations.length) return recommendations.slice(0, 14);
    return topRatedMovies;
  }, [recommendations, topRatedMovies]);

  return (
    <div className="space-y-10">
      <HeroCarousel movies={heroMovies} activeIntent={activeIntent} />

      <section className="card-surface reveal-up reveal-delay-1 grid gap-5 p-5 md:grid-cols-[1.25fr_0.75fr] md:p-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Discover Faster</p>
          <h2 className="text-2xl font-semibold text-white">Find tonight&apos;s best show in seconds</h2>
          <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search by title, actor, or genre..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button type="submit" className="sm:min-w-[120px]">
              Search
            </Button>
          </form>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate("/search?q=action")}>
              Action
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/search?q=thriller")}>
              Thriller
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/search?q=family")}>
              Family
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Your Activity</p>
          <p className="mt-2 text-sm text-slate-300">
            Watchlist <span className="font-semibold text-white">{watchlist.length}</span> | Trending loaded{" "}
            <span className="font-semibold text-white">{trendingMovies.length}</span>
          </p>
          <p className="mt-2 text-sm text-slate-400">Save movies to compare slots and checkout faster from your dashboard.</p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-4 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/20"
          >
            Open Dashboard
          </button>
        </div>
      </section>

      {error ? <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-rose-300">{error}</p> : null}
      {recError ? <p className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-amber-200">{recError}</p> : null}

      <MovieRow
        title="Trending Now"
        subtitle="Most booked movies this week"
        movies={loading ? [] : trendingMovies}
        watchlistIds={watchlistIds}
        onToggleWatchlist={toggleWatchlist}
        tone="amber"
        emptyText="No trending movies matched your filter."
      />

      <MovieRow
        title="Top Rated"
        subtitle="Highest audience score"
        movies={loading ? [] : topRatedMovies}
        watchlistIds={watchlistIds}
        onToggleWatchlist={toggleWatchlist}
        tone="cyan"
        emptyText="Top rated picks are not available right now."
      />

      <MovieRow
        title="Recommended For You"
        subtitle={recLoading ? "Refreshing your personalized picks..." : "Based on your latest searches"}
        movies={recLoading ? [] : recommendedMovies}
        watchlistIds={watchlistIds}
        onToggleWatchlist={toggleWatchlist}
        tone="emerald"
        emptyText="No personalized recommendations right now."
      />
    </div>
  );
};

export default HomePage;

