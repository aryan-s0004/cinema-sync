import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { bookingApi } from "../api/bookings";
import Button from "../components/ui/Button";

const SeatSelectionPage = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
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
        setLoading(true);
        setError("");
        const [showData, seatData] = await Promise.all([
          bookingApi.showById(showId),
          bookingApi.seats(showId),
        ]);
        setShow(showData);
        setSeats(Array.isArray(seatData) ? seatData : []);
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
    setSelectedSeatIds((current) =>
      current.includes(seat._id)
        ? current.filter((id) => id !== seat._id)
        : [...current, seat._id]
    );
  };

  const lockAndBook = async () => {
    if (!selectedSeatIds.length) {
      setError("Select at least one seat");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      await bookingApi.lockSeats({ showId, seatIds: selectedSeatIds });
      const booking = await bookingApi.createBooking({ showId, seatIds: selectedSeatIds });
      navigate(`/payment/${booking._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not lock/book selected seats");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <p className="text-slate-300 p-6">Loading seats...</p>;
  }

  return (
    <div className="space-y-6">
      {show && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
          <p className="font-medium text-white">{show.movie?.title}</p>
          <p>{show.theatreName} — {show.screenName}</p>
          <p>{new Date(show.showTime).toLocaleString()}</p>
          <p>₹{show.price} per seat</p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <p className="mb-4 text-center text-sm text-slate-500 tracking-widest">SCREEN THIS WAY ▼</p>

        <div className="space-y-2">
          {Object.keys(groupedSeats)
            .sort()
            .map((row) => (
              <div key={row} className="flex items-center gap-2">
                <span className="w-6 text-xs text-slate-500 font-mono">{row}</span>
                <div className="flex flex-wrap gap-1">
                  {groupedSeats[row].map((seat) => {
                    const isSelected = selectedSeatIds.includes(seat._id);
                    const isAvailable = seat.status === "available";
                    return (
                      <button
                        key={seat._id}
                        type="button"
                        onClick={() => toggleSeat(seat)}
                        className={[
                          "h-8 w-8 rounded text-xs font-medium transition-colors",
                          isSelected
                            ? "bg-emerald-500 text-white"
                            : isAvailable
                            ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                            : "cursor-not-allowed bg-slate-700/40 text-slate-600",
                        ].join(" ")}
                      >
                        {seat.number}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <i className="inline-block h-3 w-3 rounded bg-slate-800" /> Available
          </span>
          <span className="flex items-center gap-2">
            <i className="inline-block h-3 w-3 rounded bg-emerald-500" /> Selected
          </span>
          <span className="flex items-center gap-2">
            <i className="inline-block h-3 w-3 rounded bg-slate-700/40" /> Locked/Booked
          </span>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {selectedSeatIds.length} seat{selectedSeatIds.length !== 1 ? "s" : ""} selected
          {selectedSeatIds.length > 0 && show ? ` — ₹${show.price * selectedSeatIds.length}` : ""}
        </p>
        <Button
          loading={processing}
          disabled={processing || !selectedSeatIds.length}
          onClick={lockAndBook}
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  );
};

export default SeatSelectionPage;
