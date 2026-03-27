import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getShowsByMovie } from "../api/showApi";

const ShowsPage = () => {
  const { movieId } = useParams();
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getShowsByMovie(movieId);
        setShows(data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load shows");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [movieId]);

  if (loading) return <p>Loading shows...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <section>
      <h1>Available Shows</h1>
      <div className="list">
        {shows.map((show) => (
          <article className="list-item" key={show._id}>
            <div>
              <h3>{show.movie?.title || "Movie"}</h3>
              <p>
                {new Date(show.showTime).toLocaleString()} | {show.theatreName} | {show.screenName}
              </p>
              <p>Price: Rs. {show.price}</p>
            </div>
            <Link className="button" to={`/shows/${show._id}/seats`}>
              Select Seats
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ShowsPage;
