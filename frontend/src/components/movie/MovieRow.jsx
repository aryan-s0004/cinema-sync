import MovieRailCard from "./MovieRailCard";

const toneMap = {
  cyan: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
  amber: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
};

const MovieRow = ({
  title,
  subtitle = "",
  movies = [],
  watchlistIds = [],
  onToggleWatchlist,
  tone = "cyan",
  emptyText = "No movies available right now."
}) => {
  const toneClass = toneMap[tone] || toneMap.cyan;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        <span className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}>{movies.length} titles</span>
      </div>

      {!movies.length ? (
        <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">{emptyText}</p>
      ) : (
        <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
          {movies.map((movie) => (
            <MovieRailCard
              key={movie._id || movie.tmdbId}
              movie={movie}
              inWatchlist={watchlistIds.includes(movie._id || movie.tmdbId)}
              onToggleWatchlist={onToggleWatchlist}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default MovieRow;
