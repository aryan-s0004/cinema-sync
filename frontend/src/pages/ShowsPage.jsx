import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { movieApi } from "../api/movies";
import { bookingApi } from "../api/bookings";
import Button from "../components/ui/Button";
import formatDateTime, { formatShowWindow, formatShowWindow24, getShowtimeSegment } from "../utils/formatDate";
import formatPrice from "../utils/formatPrice";
import { buildSeatStats, buildShowInsights } from "../utils/showInsights";

const ShowsPage = () => {
  const { movieId } = useParams();
  const navigate = useNavigate();
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
        const data = await movieApi.showsByMovie(movieId);
        setShows(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load shows");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [movieId]);

  useEffect(() => {
    let active = true;

    const loadSeatStats = async () => {
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

    loadSeatStats();

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

  if (loading) {
    return <p className="p-6 text-slate-300">Loading shows...</p>;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">Available Shows</h1>
        {insightLoading ? <span className="text-xs text-slate-400">Analyzing crowd and value...</span> : null}
      </div>

      {error ? <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-rose-300">{error}</p> : null}

      {showInsightData.bestInsight ? (
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Best Showtime Insight</p>
          <p className="mt-2 text-sm text-white">
            Recommended slot: {formatDateTime(shows.find((show) => String(show._id) === showInsightData.bestShowId)?.showTime)}
          </p>
          <p className="mt-1 text-sm text-cyan-100">{showInsightData.bestInsight.reason}</p>
        </div>
      ) : null}

      {!shows.length && !error ? (
        <p className="rounded-xl border border-dashed border-slate-700 p-6 text-slate-400">
          No active shows available for this movie yet.
        </p>
      ) : null}

      <div className="grid gap-3">
        {shows.map((show) => {
          const showKey = String(show._id || "");
          const insight = insightByShowId[showKey];
          const isBestSlot = showKey === showInsightData.bestShowId;
          const duration = show?.movie?.duration || 150;

          return (
            <article
              key={show._id}
              className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                isBestSlot ? "border-cyan-400/40 bg-cyan-500/10" : "border-slate-800 bg-slate-900/70"
              }`}
            >
              <div className="space-y-1">
                <h3 className="font-medium text-white">
                  {show.theatreName} - {show.screenName}
                </h3>
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
                  </div>
                ) : null}
              </div>
              <Button onClick={() => navigate(`/booking/${show._id}`)}>Book Seats</Button>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default ShowsPage;
