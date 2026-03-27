import { Link } from "react-router-dom";
import Button from "../ui/Button";
import formatPrice from "../../utils/formatPrice";

const MovieCard = ({ movie, inWatchlist = false, onToggleWatchlist }) => {
  const id = movie?._id || movie?.tmdbId;
  const hasDbId = Boolean(movie?._id);

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 transition hover:-translate-y-1 hover:border-slate-700 hover:shadow-glow">
      <div className="relative aspect-[2/3] overflow-hidden bg-slate-900">
        {movie?.posterPath ? (
          <img
            src={movie.posterPath}
            alt={movie?.title || "Movie poster"}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full place-items-center text-slate-500">No Poster</div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-base font-semibold text-white">{movie?.title || "Untitled"}</h3>
          <p className="text-xs text-slate-400">
            Rating: {movie?.rating?.toFixed?.(1) || movie?.rating || "N/A"} | {movie?.language?.toUpperCase?.() || "EN"}
          </p>
        </div>

        <p className="line-clamp-3 text-sm text-slate-400">{movie?.overview || "No overview available."}</p>

        <div className="flex items-center justify-between gap-2">
          {hasDbId ? (
            <Link to={`/movies/${id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
          ) : (
            <Button variant="secondary" disabled>
              Syncing
            </Button>
          )}
          <Button variant={inWatchlist ? "secondary" : "ghost"} onClick={() => onToggleWatchlist?.(movie)}>
            {inWatchlist ? "Saved" : "+ Watchlist"}
          </Button>
        </div>

        <p className="text-xs text-slate-500">Starts from {formatPrice(220)}</p>
      </div>
    </article>
  );
};

export default MovieCard;
