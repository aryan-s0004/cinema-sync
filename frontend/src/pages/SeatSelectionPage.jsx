import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createBooking, getSeatsByShow, lockSeats } from "../api/bookingApi";

const SeatSelectionPage = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const groupedSeats = useMemo(() => {
    return seats.reduce((acc, seat) => {
      if (!acc[seat.row]) acc[seat.row] = [];
      acc[seat.row].push(seat);
      return acc;
    }, {});
  }, [seats]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSeatsByShow(showId);
        setSeats(data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load seats");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [showId]);

  const toggleSeat = (seat) => {
    if (seat.status !== "available") return;

    setSelectedSeatIds((current) => {
      if (current.includes(seat._id)) {
        return current.filter((id) => id !== seat._id);
      }
      return [...current, seat._id];
    });
  };

  const lockAndBook = async () => {
    if (!selectedSeatIds.length) {
      setError("Select at least one seat");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      await lockSeats({ showId, seatIds: selectedSeatIds });
      const booking = await createBooking({ showId, seatIds: selectedSeatIds });
      navigate(`/payment/${booking._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not lock/book selected seats");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <p>Loading seats...</p>;

  return (
    <section>
      <h1>Select Your Seats</h1>
      <p className="muted">Tap available seats, then continue to payment.</p>

      {Object.keys(groupedSeats)
        .sort()
        .map((row) => (
          <div className="seat-row" key={row}>
            <span className="row-label">{row}</span>
            {groupedSeats[row].map((seat) => {
              const selected = selectedSeatIds.includes(seat._id);
              const cls = `seat ${seat.status} ${selected ? "selected" : ""}`;
              return (
                <button key={seat._id} className={cls} onClick={() => toggleSeat(seat)}>
                  {seat.number}
                </button>
              );
            })}
          </div>
        ))}

      <div className="legend">
        <span><i className="dot available" /> Available</span>
        <span><i className="dot selected" /> Selected</span>
        <span><i className="dot locked" /> Locked</span>
        <span><i className="dot booked" /> Booked</span>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <button className="button" disabled={processing || !selectedSeatIds.length} onClick={lockAndBook}>
        {processing ? "Processing..." : `Continue (${selectedSeatIds.length} seats)`}
      </button>
    </section>
  );
};

export default SeatSelectionPage;
