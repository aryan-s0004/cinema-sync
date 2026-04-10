import { useContext } from "react";
import { Link } from "react-router-dom";
import { AppContext } from "../context/AppContextObject";
import useFetch from "../hooks/useFetch";
import { bookingApi } from "../api/bookings";
import PageState from "../components/common/PageState";
import formatDateTime from "../utils/formatDate";
import formatPrice from "../utils/formatPrice";

const DashboardPage = () => {
  const { watchlist, removeFromWatchlist } = useContext(AppContext);
  const { data: bookings, loading, error } = useFetch(() => bookingApi.myBookings(), []);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold text-white">My Dashboard</h1>
        <p className="text-sm text-slate-400">Track bookings and manage your saved movies.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Booking History</h2>

        <PageState loading={loading} error={error} empty={!bookings?.length} emptyText="No bookings yet.">
          <div className="grid gap-3">
            {(bookings || []).map((booking) => (
              <article
                key={booking._id}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-white">{booking?.show?.movie?.title || "Movie"}</p>
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-xs uppercase">{booking.status}</span>
                </div>
                <p>{formatDateTime(booking?.show?.showTime)}</p>
                <p>{formatPrice(booking?.totalAmount)}</p>
                <p>Seats: {(booking?.seats || []).map((seat) => `${seat.row}${seat.number}`).join(", ") || "-"}</p>

                <Link className="mt-2 inline-block text-cyan-300 hover:text-cyan-200" to={`/confirmation/${booking._id}`}>
                  View confirmation
                </Link>
              </article>
            ))}
          </div>
        </PageState>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Watchlist</h2>

        {!watchlist.length ? (
          <p className="rounded-xl border border-dashed border-slate-700 p-6 text-slate-400">Your watchlist is empty.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {watchlist.map((movie) => (
              <article key={movie._id || movie.tmdbId} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="font-medium text-white">{movie.title}</p>
                <div className="mt-3 flex items-center gap-2">
                  {movie._id ? (
                    <Link to={`/movies/${movie._id}`} className="text-sm text-cyan-300 hover:text-cyan-200">
                      Open
                    </Link>
                  ) : (
                    <span className="text-sm text-slate-500">TMDB only</span>
                  )}
                  <button
                    className="text-sm text-rose-300 hover:text-rose-200"
                    onClick={() => removeFromWatchlist(movie._id || movie.tmdbId)}
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
