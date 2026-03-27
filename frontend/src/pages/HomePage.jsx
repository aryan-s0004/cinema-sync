import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTrendingMovies } from "../api/movieApi";

const HomePage = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getTrendingMovies();
        setMovies(data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load movies");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <p>Loading movies...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <section>
      <h1>Now Showing</h1>
      <div className="grid">
        {movies.map((movie) => (
          <article className="card" key={movie._id || movie.tmdbId}>
            {movie.posterPath ? <img src={movie.posterPath} alt={movie.title} /> : null}
            <h3>{movie.title}</h3>
            <p>{movie.overview?.slice(0, 110) || "No description"}</p>
            <Link className="button" to={`/movies/${movie._id}/shows`}>
              View Shows
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
};

export default HomePage;
