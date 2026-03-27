import MovieGrid from "./MovieGrid";

const RecommendationSection = ({ movies = [], loading = false, selectedGenre = "", reason = "", watchlistIds = [], onToggleWatchlist }) => (
  <section className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold text-white">For You</h2>
      {selectedGenre ? <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-cyan-300">{selectedGenre}</span> : null}
    </div>
    {reason ? <p className="text-xs text-slate-400">{reason}</p> : null}

    <MovieGrid
      movies={movies}
      loading={loading}
      emptyText="No recommendations available right now."
      watchlistIds={watchlistIds}
      onToggleWatchlist={onToggleWatchlist}
    />
  </section>
);

export default RecommendationSection;
