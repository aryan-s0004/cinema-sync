import MovieGrid from "../movie/MovieGrid";

const MovieList = ({ movies = [], loading = false, watchlistIds = [], onToggleWatchlist }) => (
  <MovieGrid
    movies={movies}
    loading={loading}
    emptyText="No movies available."
    watchlistIds={watchlistIds}
    onToggleWatchlist={onToggleWatchlist}
  />
);

export default MovieList;
