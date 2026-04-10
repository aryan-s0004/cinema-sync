import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useDebounce from "../hooks/useDebounce";
import useMovies from "../hooks/useMovies";
import HeroCarousel from "../components/movie/HeroCarousel";
import MovieRow from "../components/movie/MovieRow";
import { AppContext } from "../context/AppContextObject";
import { AuthContext } from "../context/AuthContextObject";
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
  
  const { movies, filteredMovies, loading, error, recommendations, recLoading } = useMovies({
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

  const isSearching = debounced.length > 0;

  const heroMovies = useMemo(() => movies.slice(0, 5), [movies]);
  const trendingMovies = useMemo(() => movies.slice(0, 14), [movies]);
  const topRatedMovies = useMemo(
    () => [...movies].sort((a, b) => Number(b?.rating || 0) - Number(a?.rating || 0)).slice(0, 14),
    [movies]
  );

  const recommendedMovies = useMemo(() => {
    if (Array.isArray(recommendations) && recommendations.length) return recommendations.slice(0, 14);
    return topRatedMovies;
  }, [recommendations, topRatedMovies]);

  return (
    <div className="space-y-16 pb-20">
      <HeroCarousel movies={heroMovies} activeIntent={activeIntent} />

      <section className="relative z-30 -mt-20">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-[#1a1a1e]/80 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col md:flex-row gap-8 items-center"
          >
            <div className="flex-1 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#E50914]">Search CinemaSync</p>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Find Your Next Story</h2>
              <form onSubmit={submitSearch} className="relative mt-6">
                <input
                  type="text"
                  placeholder="Search title, actor, or genre..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm font-bold focus:outline-none focus:border-[#E50914]/50 transition-all placeholder:text-white/20"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#E50914] text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all border-none cursor-pointer shadow-lg shadow-red-500/20">
                  Search
                </button>
              </form>
            </div>
            
            <div className="hidden md:block w-px h-24 bg-white/5" />

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Quick Filters</p>
              <div className="flex flex-wrap gap-2">
                {["Action", "Sci-Fi", "Horror", "Drama"].map(g => (
                   <button 
                    key={g}
                    onClick={() => setQuery(g)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-black text-white/40 hover:text-white transition-all uppercase tracking-widest cursor-pointer"
                   >
                     {g}
                   </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="space-y-20">
        <AnimatePresence>
          {isSearching && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <MovieRow
                title="Search Results"
                subtitle={`Found ${filteredMovies.length} matches for "${debounced}"`}
                movies={loading ? [] : filteredMovies}
                watchlistIds={watchlistIds}
                onToggleWatchlist={toggleWatchlist}
                tone="emerald"
                emptyText="No exact matches found. Try a different term."
              />
            </motion.div>
          )}
        </AnimatePresence>

        {error ? (
          <div className="max-w-4xl mx-auto px-4">
             <p className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl text-rose-300 text-xs font-bold text-center uppercase tracking-widest italic">{error}</p>
          </div>
        ) : null}

        <MovieRow
          title="Trending Now"
          subtitle="Real-time occupancy leaders"
          movies={loading && !isSearching ? [] : trendingMovies}
          watchlistIds={watchlistIds}
          onToggleWatchlist={toggleWatchlist}
          tone="amber"
          emptyText="Our projectionist is late. No movies to show."
        />

        <MovieRow
          title="Top Rated"
          subtitle="Curated by the global community"
          movies={loading && !isSearching ? [] : topRatedMovies}
          watchlistIds={watchlistIds}
          onToggleWatchlist={toggleWatchlist}
          tone="cyan"
          emptyText="Waiting for critic scores to sync."
        />

        {!isSearching && (
          <MovieRow
            title="Beyond Recommendations"
            subtitle={recLoading ? "Analyzing your taste profile..." : "Personalized for you"}
            movies={recLoading ? [] : recommendedMovies}
            watchlistIds={watchlistIds}
            onToggleWatchlist={toggleWatchlist}
            tone="emerald"
            emptyText="Start searching for content to unlock personalized picks."
          />
        )}
      </div>
    </div>
  );
};

export default HomePage;
