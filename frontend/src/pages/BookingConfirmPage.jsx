import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { bookingApi } from "../api/bookings";
import formatDateTime from "../utils/formatDate";
import formatPrice from "../utils/formatPrice";

const BookingConfirmPage = () => {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        } catch (_err) {
          setTicket(null);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load confirmation");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [bookingId]);

  if (loading) {
    return <p className="text-slate-300">Loading confirmation...</p>;
  }

  if (error) {
    return <p className="text-rose-400">{error}</p>;
  }

  return (
    <section className="mx-auto max-w-lg space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <h1 className="text-2xl font-semibold text-white">Booking Confirmed</h1>

      <div className="space-y-1 text-sm text-slate-300">
        <p>Booking ID: {booking?._id}</p>
        <p>Status: {booking?.status}</p>
        <p>Movie: {booking?.show?.movie?.title}</p>
        <p>Show Time: {formatDateTime(booking?.show?.showTime)}</p>
        <p>Total: {formatPrice(booking?.totalAmount)}</p>
        <p>Seats: {(booking?.seats || []).map((seat) => `${seat.row}${seat.number}`).join(", ")}</p>
      </div>

      {ticket ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          <p>Ticket Code: {ticket.ticketCode}</p>
          <p>Status: {ticket.status}</p>
        </div>
      ) : (
        <p className="text-sm text-slate-400">Ticket is still being generated. Refresh in a few seconds.</p>
      )}

      <div className="flex gap-3">
        <Link to="/dashboard" className="text-cyan-300 hover:text-cyan-200">
          Open dashboard
        </Link>
        <Link to="/" className="text-slate-300 hover:text-white">
          Back home
        </Link>
      </div>
    </section>
  );
};

export default BookingConfirmPage;
