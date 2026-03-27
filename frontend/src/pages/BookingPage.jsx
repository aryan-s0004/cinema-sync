import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { bookingApi } from "../api/bookings";
import SeatGrid from "../components/booking/SeatGrid";
import BookingSummary from "../components/booking/BookingSummary";
import Button from "../components/ui/Button";
import useBooking from "../hooks/useBooking";
import formatDateTime from "../utils/formatDate";
import formatPrice from "../utils/formatPrice";

const BookingPage = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [loadingShow, setLoadingShow] = useState(true);
  const [showError, setShowError] = useState("");

  const {
    seats,
    seatsLoading,
    seatsError,
    refetchSeats,
    selectedSeatIds,
    lockUntil,
    processing,
    error,
    toggleSeatSelection,
    createBookingFromSelection
  } = useBooking(showId);

  useEffect(() => {
    const loadShow = async () => {
      try {
        setLoadingShow(true);
        setShowError("");
        const showData = await bookingApi.showById(showId);
        setShow(showData);
      } catch (err) {
        setShowError(err.response?.data?.message || "Failed to load show");
      } finally {
        setLoadingShow(false);
      }
    };

    loadShow();
  }, [showId]);

  useEffect(() => {
    const timer = setInterval(() => {
      refetchSeats().catch(() => {});
    }, 30000);

    return () => clearInterval(timer);
  }, [refetchSeats]);

  const selectedSeats = useMemo(
    () => seats.filter((seat) => selectedSeatIds.includes(seat._id)),
    [seats, selectedSeatIds]
  );

  const amount = (show?.price || 0) * selectedSeatIds.length;

  const handleProceed = async () => {
    const booking = await createBookingFromSelection();
    if (booking?._id) {
      navigate(`/payment/${booking._id}`);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-white">Seat Selection</h1>

        {loadingShow ? <p className="text-slate-300">Loading show...</p> : null}
        {showError ? <p className="text-rose-400">{showError}</p> : null}
        {show ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">{show.movie?.title}</p>
            <p>{show.theatreName} - {show.screenName}</p>
            <p>{formatDateTime(show.showTime)}</p>
            <p>{formatPrice(show.price)} per seat</p>
          </div>
        ) : null}

        {seatsLoading ? <p className="text-slate-300">Loading seats...</p> : null}
        {seatsError ? <p className="text-rose-400">{seatsError}</p> : null}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="mb-4 text-center text-sm text-slate-500">SCREEN THIS WAY</p>
          <SeatGrid seats={seats} selectedSeatIds={selectedSeatIds} onToggle={toggleSeatSelection} />

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded bg-slate-900" /> Available</span>
            <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded bg-emerald-500" /> Selected</span>
            <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded bg-slate-700" /> Locked/Booked</span>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <BookingSummary
          selectedCount={selectedSeatIds.length}
          amount={formatPrice(amount)}
          status={lockUntil ? `Lock valid till ${formatDateTime(lockUntil)}` : "Select seats to continue"}
        />

        {selectedSeats.length ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="mb-2 text-sm font-medium text-white">Selected Seats</p>
            <p className="text-sm text-slate-300">{selectedSeats.map((seat) => `${seat.row}${seat.number}`).join(", ")}</p>
          </div>
        ) : null}

        {error ? <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p> : null}

        <Button className="w-full" loading={processing} onClick={handleProceed}>
          Continue to Payment
        </Button>
      </aside>
    </div>
  );
};

export default BookingPage;
