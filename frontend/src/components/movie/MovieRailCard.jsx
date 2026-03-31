import { Link } from "react-router-dom";
import Button from "../ui/Button";

const formatRating = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "N/A";
  return numeric.toFixed(1);
};

const getGenreLabel = (movie) => {
  if (Array.isArray(movie?.genres) && movie.genres.length) {
    return movie.genres.slice(0, 2).join(", ");
  }
  return "Action";
};

const getDurationLabel = (movie) => {
  const duration = Number(movie?.duration);
  if (!Number.isFinite(duration) || duration <= 0) return "120 mins";
  return `${duration} mins`;
};

const MovieRailCard = ({ movie, inWatchlist = false, onToggleWatchlist }) => {
  const id = movie?._id || movie?.tmdbId;
  const hasDbId = Boolean(movie?._id);
  const trailerSearch = encodeURIComponent(`${movie?.title || "movie"} trailer`);
  const trailerUrl = `https://www.youtube.com/results?search_query=${trailerSearch}`;

  return (
    <article className="group reveal-up reveal-delay-2 min-w-[230px] max-w-[230px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-slate-950/30 transition hover:-translate-y-1 hover:border-cyan-400/40">
      <div className="relative aspect-[2/3] overflow-hidden bg-slate-900">
        {movie?.posterPath ? (
          <img
            src={movie.posterPath}
            alt={movie?.title || "Movie poster"}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-800 to-slate-900 border-b border-white/5">
             <div className="absolute top-0 left-0 w-full h-[2px] bg-[#E50914] opacity-40 shadow-[0_0_10px_#E50914]" />
             <p className="text-[10px] font-black text-white/5 uppercase tracking-[0.5em] mb-4">CinemaSync Exclusive</p>
             <h4 className="text-[13px] font-black text-white/20 italic uppercase tracking-tighter leading-tight line-clamp-3">{movie?.title || "Unlimited Premiere"}</h4>
             <div className="mt-6 w-10 h-10 rounded-full bg-white/2 flex items-center justify-center border border-white/5">
                <span className="text-white/10 text-[8px] font-black">CS</span>
             </div>
          </div>
        )}

        <div className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-2 py-1 text-xs font-medium text-amber-300">
          Rating {formatRating(movie?.rating)}
        </div>

        <button
          type="button"
          className={`absolute right-3 top-3 rounded-full px-2 py-1 text-xs transition ${
            inWatchlist ? "bg-cyan-400/90 text-slate-950" : "bg-slate-950/80 text-slate-100 hover:bg-slate-800"
          }`}
          onClick={() => onToggleWatchlist?.(movie)}
        >
          {inWatchlist ? "Saved" : "+ List"}
        </button>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-sm font-semibold text-white">{movie?.title || "Untitled"}</h3>
          <p className="text-xs text-slate-400">{getGenreLabel(movie)}</p>
          <p className="text-xs text-slate-500">{getDurationLabel(movie)}</p>
        </div>

        <div className="flex items-center gap-2">
          {hasDbId ? (
            <Link to={`/movies/${id}`} className="flex-1">
              <Button className="w-full rounded-lg px-3 py-2 text-xs">Book Now</Button>
            </Link>
          ) : (
            <Button className="flex-1 rounded-lg px-3 py-2 text-xs" disabled>
              Syncing
            </Button>
          )}

          <a
            href={trailerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-300/40 hover:text-cyan-100"
          >
            Trailer
          </a>
        </div>
      </div>
    </article>
  );
};

export default MovieRailCard;
