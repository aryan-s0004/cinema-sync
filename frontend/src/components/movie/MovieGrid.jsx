import MovieCard from "./MovieCard";
import SkeletonCard from "../ui/SkeletonCard";

const MovieGrid = ({ movies = [], loading = false, emptyText = "No movies found.", watchlistIds = [], onToggleWatchlist }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  if (!movies.length) {
    return <p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">{emptyText}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {movies.map((movie) => (
        <MovieCard
          key={movie._id || movie.tmdbId}
          movie={movie}
          inWatchlist={watchlistIds.includes(movie._id || movie.tmdbId)}
          onToggleWatchlist={onToggleWatchlist}
        />
      ))}
    </div>
  );
};

export default MovieGrid;
