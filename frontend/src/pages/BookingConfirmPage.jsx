import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { bookingApi } from "../api/bookings";
import { movieApi } from "../api/movies";
import formatDateTime from "../utils/formatDate";
import formatPrice from "../utils/formatPrice";

const BookingConfirmPage = () => {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [nextRecommendation, setNextRecommendation] = useState(null);
  const [recommendationReason, setRecommendationReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingTicket, setDownloadingTicket] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const bookingData = await bookingApi.bookingById(bookingId);
        setBooking(bookingData);

        try {
          const ticketData = await bookingApi.ticketByBooking(bookingId);
          setTicket(ticketData);
        } catch {
          setTicket(null);
        }

        try {
          const genreHint = bookingData?.show?.movie?.genres?.[0] || "Action";
          const recommendationData = await movieApi.recommend({ genre: genreHint });
          const bookingMovieId = bookingData?.show?.movie?._id || bookingData?.show?.movie?.tmdbId;
          const topPick =
            (recommendationData?.recommendations || []).find(
              (movie) => (movie?._id || movie?.tmdbId) && (movie?._id || movie?.tmdbId) !== bookingMovieId
            ) || recommendationData?.recommendations?.[0] || null;
          setNextRecommendation(topPick);
          setRecommendationReason(recommendationData?.reason || "");
        } catch {
          setNextRecommendation(null);
          setRecommendationReason("");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load confirmation");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [bookingId]);

  const handleDownloadTicket = async () => {
    if (!ticket?.ticketCode || downloadingTicket) return;

    try {
      setDownloadingTicket(true);
      setDownloadError("");
      const { blob, filename } = await bookingApi.downloadTicket(ticket.ticketCode);
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename || `${ticket.ticketCode}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setDownloadError(err.response?.data?.message || "Ticket download failed. Please try again.");
    } finally {
      setDownloadingTicket(false);
    }
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-700 bg-slate-900/70 p-8">
        <p className="text-slate-300">Preparing your booking confirmation...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8">
        <p className="text-rose-300">{error}</p>
      </section>
    );
  }

  const seatLabels = (booking?.seats || []).map((seat) => `${seat.row}${seat.number}`);
  const nextMovieId = nextRecommendation?._id || null;
  const nextPoster = nextRecommendation?.posterPath || nextRecommendation?.backdropPath || "";

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-emerald-400/30 bg-[linear-gradient(150deg,rgba(6,78,59,0.28),rgba(15,23,42,0.94))] p-6 sm:p-8">
        <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full border border-emerald-300/30 bg-emerald-500/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-8 h-36 w-36 rounded-full border border-cyan-300/30 bg-cyan-500/10 blur-2xl" />

        <div className="relative z-10 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Booking Success</p>
            <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Your seats are locked and confirmed.</h1>
            <p className="mt-2 text-sm text-emerald-100">Enjoy the show. Your ticket details are ready below.</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="relative overflow-hidden rounded-2xl border border-slate-600/60 bg-slate-950/70 p-4 sm:p-5">
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-700" />
              <p className="text-sm font-semibold text-white">{booking?.show?.movie?.title || "Movie"}</p>
              <p className="mt-1 text-xs text-slate-400">Booking ID: {booking?._id}</p>

              <div className="mt-4 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
                <p>
                  <span className="block text-xs uppercase text-slate-500">Show Time</span>
                  {formatDateTime(booking?.show?.showTime)}
                </p>
                <p>
                  <span className="block text-xs uppercase text-slate-500">Total Paid</span>
                  {formatPrice(booking?.totalAmount)}
                </p>
                <p>
                  <span className="block text-xs uppercase text-slate-500">Status</span>
                  {booking?.status || "confirmed"}
                </p>
                <p>
                  <span className="block text-xs uppercase text-slate-500">Seats</span>
                  {seatLabels.join(", ") || "N/A"}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {seatLabels.map((label) => (
                  <span key={label} className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-100">
                    {label}
                  </span>
                ))}
              </div>
            </article>

            <div className="space-y-4">
              {ticket ? (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Ticket Issued</p>
                  <p className="mt-2">Code: {ticket.ticketCode}</p>
                  <p>Status: {ticket.status}</p>
                  <button
                    type="button"
                    onClick={handleDownloadTicket}
                    disabled={downloadingTicket}
                    className="mt-3 rounded-lg border border-emerald-300/40 bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-50 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {downloadingTicket ? "Preparing PDF..." : "Download PDF Ticket"}
                  </button>
                  {downloadError ? <p className="mt-2 text-xs text-rose-200">{downloadError}</p> : null}
                </div>
              ) : (
                <p className="rounded-2xl border border-slate-600 bg-slate-900/60 p-4 text-sm text-slate-300">
                  Ticket generation in progress. Refresh in a few seconds.
                </p>
              )}

              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Next Actions</p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <Link to="/dashboard" className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-cyan-100 hover:bg-cyan-500/20">
                    Open Dashboard
                  </Link>
                  <Link to="/" className="rounded-lg border border-slate-600 px-3 py-2 text-slate-200 hover:border-slate-400">
                    Back Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {nextRecommendation ? (
        <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">AI Next Pick</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-[0.38fr_0.62fr]">
            <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
              {nextPoster ? (
                <img src={nextPoster} alt={nextRecommendation.title || "Recommended movie"} className="h-full min-h-[220px] w-full object-cover" />
              ) : (
                <div className="grid h-full min-h-[220px] place-items-center text-slate-500">No Poster</div>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">{nextRecommendation.title || "Recommended movie"}</h2>
              <p className="text-sm text-slate-300">{nextRecommendation.overview || "Recommended based on your latest booking."}</p>
              <p className="text-xs text-slate-400">{recommendationReason || "Generated from your recent preferences."}</p>

              <div className="flex flex-wrap gap-3">
                {nextMovieId ? (
                  <Link to={`/movies/${nextMovieId}`} className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/20">
                    Book This Next
                  </Link>
                ) : null}
                <Link to="/search" className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-slate-400">
                  Explore More Movies
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default BookingConfirmPage;
