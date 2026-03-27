import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useDebounce from "../hooks/useDebounce";
import useMovies from "../hooks/useMovies";
import MovieGrid from "../components/movie/MovieGrid";
import RecommendationSection from "../components/movie/RecommendationSection";
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
  const { filteredMovies, loading, error, recommendations, recLoading, selectedGenre, recommendationReason } = useMovies({
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
      } catch (_err) {
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

  return (
    <div className="space-y-10">
      <section className="grid gap-6 rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 via-brand-900/40 to-slate-900 p-6 md:grid-cols-2 md:p-8">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">CinemaSync</p>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">Pick a movie. Lock seats. Pay once.</h1>
          <p className="text-slate-300">Fast, clean booking flow with live availability and payment-safe recovery.</p>

          <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search by title or genre..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button type="submit">Search</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate("/search?q=action")}>
              Action Picks
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/search?q=romance")}>
              Romance Picks
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/search?q=family")}>
              Family Picks
            </Button>
          </div>
        </div>

        <div className="card-surface flex flex-col justify-between p-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Quick Start Booking</h2>
            <p className="mt-2 text-sm text-slate-400">Ready in 5 taps from discovery to ticket.</p>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
            <span>Saved Watchlist</span>
            <span className="rounded-full bg-slate-800 px-2 py-1 text-xs">{watchlist.length} movies</span>
          </div>

          {activeIntent?.show?._id ? (
            <button
              type="button"
              onClick={() => navigate(`/booking/${activeIntent.show._id}`)}
              className="mt-4 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-left text-sm text-cyan-200 hover:bg-cyan-500/20"
            >
              Continue booking: {activeIntent.show.movie?.title || "selected movie"} ({activeIntent.seatIds?.length || 0} seats)
            </button>
          ) : null}

          <Link to="/dashboard" className="mt-5 text-sm text-cyan-300 hover:text-cyan-200">
            Go to dashboard
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Trending Movies</h2>
        </div>

        {error ? <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-rose-300">{error}</p> : null}

        <MovieGrid
          movies={filteredMovies}
          loading={loading}
          emptyText="No trending movies matched your search."
          watchlistIds={watchlistIds}
          onToggleWatchlist={toggleWatchlist}
        />
      </section>

      <RecommendationSection
        movies={recommendations}
        loading={recLoading}
        selectedGenre={selectedGenre}
        reason={recommendationReason}
        watchlistIds={watchlistIds}
        onToggleWatchlist={toggleWatchlist}
      />
    </div>
  );
};

export default HomePage;

