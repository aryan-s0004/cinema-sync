import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { movieApi } from "../api/movies";
import { bookingApi } from "../api/bookings";
import formatDateTime, { formatShowWindow, formatShowWindow24, getShowtimeSegment } from "../utils/formatDate";
import formatPrice from "../utils/formatPrice";
import { buildSeatStats, buildShowInsights } from "../utils/showInsights";
import Button from "../components/ui/Button";
import PageState from "../components/common/PageState";
import { getPosterImageClassName } from "../utils/movieMedia";

const MovieDetailPage = () => {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [seatStatsByShow, setSeatStatsByShow] = useState({});
  const [insightLoading, setInsightLoading] = useState(false);
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

  useEffect(() => {
    let active = true;

    const loadSeatInsights = async () => {
      if (!shows.length) {
        setSeatStatsByShow({});
        return;
      }

      try {
        setInsightLoading(true);
        const entries = await Promise.all(
          shows.map(async (show) => {
            const showKey = String(show._id || "");
            try {
              const seats = await bookingApi.seats(showKey);
              return [showKey, buildSeatStats(seats)];
            } catch {
              return [showKey, null];
            }
          })
        );

        if (!active) return;

        const next = entries.reduce((acc, [showKey, stats]) => {
          if (stats) acc[showKey] = stats;
          return acc;
        }, {});
        setSeatStatsByShow(next);
      } finally {
        if (active) setInsightLoading(false);
      }
    };

    loadSeatInsights();

    return () => {
      active = false;
    };
  }, [shows]);

  const showInsightData = useMemo(() => buildShowInsights(shows, seatStatsByShow), [shows, seatStatsByShow]);

  const insightByShowId = useMemo(
    () =>
      showInsightData.insights.reduce((acc, item) => {
        acc[item.showId] = item;
        return acc;
      }, {}),
    [showInsightData.insights]
  );

  return (
    <PageState loading={loading} error={error} empty={!movie} emptyText="Movie not found.">
      <div className="space-y-8">
        <section className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
            {movie?.posterPath ? (
              <img
                src={movie.posterPath}
                alt={movie.title}
                className={`${getPosterImageClassName(movie.posterPath)} min-h-[420px]`}
              />
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Available Shows</h2>
            {insightLoading ? <span className="text-xs text-slate-400">Refreshing showtime insights...</span> : null}
          </div>

          {showInsightData.bestInsight ? (
            <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Best Showtime Insight</p>
              <p className="mt-2 text-sm font-medium text-white">
                Recommended slot: {formatDateTime(shows.find((show) => String(show._id) === showInsightData.bestShowId)?.showTime)}
              </p>
              <p className="mt-1 text-sm text-cyan-100">{showInsightData.bestInsight.reason}</p>
            </div>
          ) : null}

          {!shows.length ? (
            <p className="rounded-xl border border-dashed border-slate-700 p-6 text-slate-400">No active shows for this movie yet.</p>
          ) : (
            <div className="grid gap-3">
              {shows.map((show) => {
                const showKey = String(show._id || "");
                const insight = insightByShowId[showKey];
                const isBestSlot = showKey === showInsightData.bestShowId;
                const duration = show?.movie?.duration || movie?.duration || 150;

                return (
                  <article
                    key={show._id}
                    className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                      isBestSlot ? "border-cyan-400/40 bg-cyan-500/10" : "border-slate-800 bg-slate-900/70"
                    }`}
                  >
                    <div className="space-y-1">
                      <h3 className="font-medium text-white">{show.theatreName} - {show.screenName}</h3>
                      <p className="text-sm text-slate-400">{formatDateTime(show.showTime)}</p>
                      <p className="text-xs text-slate-500">
                        Timing: {formatShowWindow(show.showTime, duration)} ({formatShowWindow24(show.showTime, duration)})
                      </p>
                      <p className="text-xs text-cyan-300">{getShowtimeSegment(show.showTime)} Show</p>
                      <p className="text-sm text-slate-400">{formatPrice(show.price)} per seat</p>
                      {insight ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-300">{insight.crowdLabel}</span>
                          <span className="rounded-full border border-emerald-500/40 px-2 py-0.5 text-xs text-emerald-200">
                            {insight.occupancyPercent}% occupied
                          </span>
                          {isBestSlot ? (
                            <span className="rounded-full border border-cyan-400/50 px-2 py-0.5 text-xs text-cyan-100">Best Pick</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <Button onClick={() => navigate(`/booking/${show._id}`)}>Book Seats</Button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PageState>
  );
};

export default MovieDetailPage;
