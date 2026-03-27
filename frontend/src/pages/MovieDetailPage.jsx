import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { movieApi } from "../api/movies";
import formatDateTime from "../utils/formatDate";
import formatPrice from "../utils/formatPrice";
import Button from "../components/ui/Button";
import PageState from "../components/common/PageState";

const MovieDetailPage = () => {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [movieData, showData] = await Promise.all([movieApi.details(movieId), movieApi.showsByMovie(movieId)]);

        setMovie(movieData);
        setShows(Array.isArray(showData) ? showData : []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load movie details");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [movieId]);

  return (
    <PageState loading={loading} error={error} empty={!movie} emptyText="Movie not found.">
      <div className="space-y-8">
        <section className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
            {movie?.posterPath ? (
              <img src={movie.posterPath} alt={movie.title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full min-h-[420px] place-items-center text-slate-500">No Poster</div>
            )}
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-semibold text-white">{movie?.title}</h1>
            <p className="text-sm text-slate-400">
              Rating: {movie?.rating || "N/A"} | Language: {movie?.language?.toUpperCase?.() || "EN"}
            </p>
            <p className="leading-7 text-slate-300">{movie?.overview || "No overview available."}</p>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate("/search")}>Find Similar</Button>
              <Link to="/">
                <Button variant="secondary">Back to Home</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Available Shows</h2>

          {!shows.length ? (
            <p className="rounded-xl border border-dashed border-slate-700 p-6 text-slate-400">No active shows for this movie yet.</p>
          ) : (
            <div className="grid gap-3">
              {shows.map((show) => (
                <article
                  key={show._id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <h3 className="font-medium text-white">{show.theatreName} - {show.screenName}</h3>
                    <p className="text-sm text-slate-400">{formatDateTime(show.showTime)}</p>
                    <p className="text-sm text-slate-400">{formatPrice(show.price)} per seat</p>
                  </div>

                  <Button onClick={() => navigate(`/booking/${show._id}`)}>Book Seats</Button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageState>
  );
};

export default MovieDetailPage;
