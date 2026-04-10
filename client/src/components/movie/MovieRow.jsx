import { useRef } from "react";
import MovieRailCard from "./MovieRailCard";

const toneMap = {
  cyan: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
  amber: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
};

const SkeletonCard = () => (
  <div className="min-w-[248px] max-w-[248px] overflow-hidden rounded-[1.75rem] border border-slate-800/60 bg-slate-950/80 animate-pulse">
    <div className="aspect-[2/3] bg-slate-800/60" />
    <div className="p-4 space-y-3">
      <div className="h-3 w-3/4 rounded-full bg-slate-700/60" />
      <div className="h-2.5 w-1/2 rounded-full bg-slate-700/40" />
      <div className="flex gap-2 pt-1">
        <div className="h-2 w-12 rounded-full bg-slate-700/30" />
        <div className="h-2 w-10 rounded-full bg-slate-700/30" />
      </div>
    </div>
  </div>
);

const MovieRow = ({
  title,
  subtitle = "",
  movies = [],
  loading = false,
  watchlistIds = [],
  onToggleWatchlist,
  tone = "cyan",
  emptyText = "No movies available right now.",
}) => {
  const scrollRef = useRef(null);
  const toneClass = toneMap[tone] || toneMap.cyan;

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  return (
    <section className="relative space-y-6">
      <div className="flex flex-col gap-2 px-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">{title}</h2>
          {subtitle ? <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{subtitle}</p> : null}
        </div>
        <div
          className={`flex w-fit items-center gap-2 rounded-full border px-5 py-2 text-[9px] font-black uppercase tracking-[0.2em] shadow-xl ${toneClass}`}
        >
          <div className="h-1 w-1 rounded-full bg-current animate-pulse" />
          {loading ? "Loading..." : `${movies.length} Curated Titles`}
        </div>
      </div>

      {loading ? (
        <div className="flex gap-6 overflow-x-hidden px-2 pb-8">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : !movies.length ? (
        <div className="rounded-[2rem] border border-dashed border-white/5 bg-white/2 p-12 text-center">
          <p className="text-xs font-black uppercase italic tracking-widest text-white/20">{emptyText}</p>
        </div>
      ) : (
        <div className="relative group">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/80 text-lg text-white opacity-0 transition-opacity hover:bg-white/10 md:flex md:-ml-6 group-hover:opacity-100"
            aria-label="Scroll left"
          >
            {"<"}
          </button>

          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden w-16 bg-gradient-to-r from-[#081225] to-transparent md:block" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden w-16 bg-gradient-to-l from-[#081225] to-transparent md:block" />

          <div ref={scrollRef} className="no-scrollbar flex gap-6 overflow-x-auto px-2 pb-8 scroll-smooth snap-x snap-mandatory md:px-1">
            {movies.map((movie) => (
              <div key={movie._id || movie.tmdbId} className="snap-start flex-shrink-0">
                <MovieRailCard
                  movie={movie}
                  inWatchlist={watchlistIds.includes(movie._id || movie.tmdbId)}
                  onToggleWatchlist={onToggleWatchlist}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/80 text-lg text-white opacity-0 transition-opacity hover:bg-white/10 md:flex md:-mr-6 group-hover:opacity-100"
            aria-label="Scroll right"
          >
            {">"}
          </button>
        </div>
      )}
    </section>
  );
};

export default MovieRow;
