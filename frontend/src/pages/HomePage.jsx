import { useContext, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useDebounce from "../hooks/useDebounce";
import useMovies from "../hooks/useMovies";
import MovieGrid from "../components/movie/MovieGrid";
import RecommendationSection from "../components/movie/RecommendationSection";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { AppContext } from "../context/AppContext";

const moodOptions = ["excited", "happy", "romantic", "thoughtful", "family", "scary"];

const HomePage = () => {
  const navigate = useNavigate();
  const { watchlist, isInWatchlist, addToWatchlist, removeFromWatchlist, recommendMood, setRecommendMood } = useContext(AppContext);
  const [query, setQuery] = useState("");

  const debounced = useDebounce(query, 350);
  const { filteredMovies, loading, error, recommendations, recLoading, selectedGenre } = useMovies({
    type: "trending",
    query: debounced,
    includeRecommendations: true,
    mood: recommendMood
  });

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
          <h1 className="text-3xl font-semibold text-white md:text-4xl">Discover movies, reserve seats, and book in minutes.</h1>
          <p className="text-slate-300">Live TMDB powered catalog with seat locking and instant booking confirmation.</p>

          <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search movies, genres, actors..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button type="submit">Search</Button>
          </form>

          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-300">Recommendation mood</label>
            <select
              value={recommendMood}
              onChange={(event) => setRecommendMood(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            >
              {moodOptions.map((mood) => (
                <option key={mood} value={mood}>
                  {mood}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card-surface flex flex-col justify-between p-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Quick Start Booking</h2>
            <p className="mt-2 text-sm text-slate-400">1. Pick a movie 2. Pick showtime 3. Select seats 4. Pay 5. Get your ticket.</p>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
            <span>Saved Watchlist</span>
            <span className="rounded-full bg-slate-800 px-2 py-1 text-xs">{watchlist.length} movies</span>
          </div>

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
        watchlistIds={watchlistIds}
        onToggleWatchlist={toggleWatchlist}
      />
    </div>
  );
};

export default HomePage;

