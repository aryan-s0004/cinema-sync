import { useRef } from "react";
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
    <section className="space-y-6 group/row relative">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between px-2">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">{title}</h2>
          {subtitle ? <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{subtitle}</p> : null}
        </div>
        <div className={`w-fit rounded-full border px-5 py-2 text-[9px] font-black uppercase tracking-[0.2em] shadow-xl ${toneClass} flex items-center gap-2`}>
           <div className="w-1 h-1 rounded-full bg-current animate-pulse" />
           {movies.length} Curated Titles
        </div>
      </div>

      {!movies.length ? (
        <div className="rounded-[2rem] border border-dashed border-white/5 bg-white/2 p-12 text-center">
           <p className="text-xs font-black uppercase tracking-widest text-white/20 italic">{emptyText}</p>
        </div>
      ) : (
        <div className="relative group">
          {/* Scroll Buttons */}
          <button 
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/80 border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 -ml-6"
            aria-label="Scroll Left"
          >
            ←
          </button>
          
          <div 
            ref={scrollRef}
            className="no-scrollbar flex gap-6 overflow-x-auto pb-8 scroll-smooth snap-x snap-mandatory px-2"
          >
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
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/80 border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 -mr-6"
            aria-label="Scroll Right"
          >
            →
          </button>
        </div>
      )}
    </section>
  );
};

export default MovieRow;
