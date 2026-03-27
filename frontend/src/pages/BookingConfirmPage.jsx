import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getBookingById } from "../api/bookingApi";

const BookingConfirmPage = () => {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getBookingById(bookingId);
        setBooking(data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load confirmation");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId]);

  if (loading) return <p>Loading confirmation...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <section>
      <h1>Booking Confirmed</h1>
      <div className="card narrow">
        <p>Booking ID: {booking?._id}</p>
        <p>Status: {booking?.status}</p>
        <p>Movie: {booking?.show?.movie?.title}</p>
        <p>
          Seats: {(booking?.seats || []).map((seat) => `${seat.row}${seat.number}`).join(", ")}
        </p>
      </div>
      <Link className="button" to="/">
        Back To Movies
      </Link>
    </section>
  );
};

export default BookingConfirmPage;
