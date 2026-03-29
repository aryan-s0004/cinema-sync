import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { bookingApi } from "../api/bookings";
import SeatGrid from "../components/booking/SeatGrid";
import BookingSummary from "../components/booking/BookingSummary";
import Button from "../components/ui/Button";
import useBooking from "../hooks/useBooking";
import formatDateTime, { formatShowWindow } from "../utils/formatDate";
import formatPrice from "../utils/formatPrice";
import { buildSeatStats } from "../utils/showInsights";

const seatPreferenceOptions = [
  { key: "center", label: "Center View" },
  { key: "premium", label: "Premium" },
  { key: "budget", label: "Budget" },
  { key: "front", label: "Front" },
  { key: "back", label: "Back" },
];

const BookingPage = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [loadingShow, setLoadingShow] = useState(true);
  const [showError, setShowError] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionInfo, setSuggestionInfo] = useState("");
  const [suggestionMeta, setSuggestionMeta] = useState(null);
  const [autoPickCount, setAutoPickCount] = useState(2);
  const [activePreference, setActivePreference] = useState("center");
  const [intentLoaded, setIntentLoaded] = useState(false);

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
    applySeatSelection,
    suggestBestSeats,
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

  useEffect(() => {
    const loadIntent = async () => {
      try {
        const intent = await bookingApi.getActiveBookingIntent(showId);
        if (!intent?.seatIds?.length) {
          setIntentLoaded(true);
          return;
        }

        const applied = applySeatSelection(intent.seatIds, "replace");
        if (applied.length) {
          setSuggestionInfo(`Restored ${applied.length} seat(s) from your last session.`);
          setAutoPickCount(applied.length);
        }
      } catch {
        // Intent recovery is best-effort and should not block booking.
      } finally {
        setIntentLoaded(true);
      }
    };

    loadIntent();
  }, [applySeatSelection, showId]);

  useEffect(() => {
    if (!intentLoaded) return;

    const timeout = setTimeout(() => {
      bookingApi
        .upsertBookingIntent({
          showId,
          seatIds: selectedSeatIds,
          step: "seat_selection",
          lockUntil,
          active: selectedSeatIds.length > 0,
        })
        .catch(() => {});
    }, 300);

    return () => clearTimeout(timeout);
  }, [intentLoaded, lockUntil, selectedSeatIds, showId]);

  const selectedSeats = useMemo(
    () => seats.filter((seat) => selectedSeatIds.includes(seat._id)),
    [seats, selectedSeatIds]
  );

  const amount = (show?.price || 0) * selectedSeatIds.length;
  const seatStats = useMemo(() => buildSeatStats(seats), [seats]);
  const seatTypeBreakdown = useMemo(
    () =>
      seats.reduce(
        (acc, seat) => {
          const typeKey = seat.type || "standard";
          acc[typeKey] = (acc[typeKey] || 0) + 1;
          return acc;
        },
        { standard: 0, premium: 0, vip: 0 }
      ),
    [seats]
  );

  const showtimeInsight = useMemo(() => {
    if (!show?.showTime) return "Choose seats based on your comfort preference.";
    const hour = new Date(show.showTime).getHours();
    const crowd = seatStats.occupancyPercent;

    if (crowd <= 35 && hour < 17) {
      return "This is a calm low-crowd slot. Good for comfort and quick checkout.";
    }
    if (crowd <= 45) {
      return "Balanced crowd level right now. Smooth entry expected.";
    }
    if (hour >= 18 && hour <= 22) {
      return "Prime-time demand is high. Lock seats soon for best options.";
    }
    return "Crowd is building up. Premium suggestions can help keep viewing quality high.";
  }, [seatStats.occupancyPercent, show]);

  const quotePreview = useMemo(() => {
    const base = Math.max(Number(amount || 0), 0);
    const convenienceFee = Math.round(Math.max(15, base * 0.03));
    const taxes = Math.round(convenienceFee * 0.18);
    return { baseAmount: base, convenienceFee, taxes, totalPayable: base + convenienceFee + taxes };
  }, [amount]);

  const handleAutoPick = async (preference = "center") => {
    const targetCount = autoPickCount;
    try {
      setSuggesting(true);
      const suggestion = await suggestBestSeats({ count: targetCount, preference });
      setActivePreference(preference);
      if (suggestion?.seatLabels?.length) {
        setSuggestionMeta(suggestion);
        setSuggestionInfo(`Suggested seats: ${suggestion.seatLabels.join(", ")} (${preference}, ${targetCount} seats)`);
      }
    } catch (err) {
      setSuggestionMeta(null);
      setSuggestionInfo(err.response?.data?.message || "Could not auto-pick seats right now.");
    } finally {
      setSuggesting(false);
    }
  };

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
            <p className="text-xs text-slate-400">Timing: {formatShowWindow(show.showTime, show?.movie?.duration || 150)}</p>
            <p>{formatPrice(show.price)} per seat</p>
            <p className="mt-2 rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200">{showtimeInsight}</p>
          </div>
        ) : null}

        {seatsLoading ? <p className="text-slate-300">Loading seats...</p> : null}
        {seatsError ? <p className="text-rose-400">{seatsError}</p> : null}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="mb-4 text-center text-sm text-slate-500">SCREEN THIS WAY</p>
          <SeatGrid seats={seats} selectedSeatIds={selectedSeatIds} onToggle={toggleSeatSelection} />

          <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/60 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Smart Seat Suggestion</p>
            <p className="mt-1 text-xs text-slate-400">Choose seat count and preference, then let AI pick the best contiguous cluster.</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`rounded-md border px-2.5 py-1 text-xs transition ${
                    autoPickCount === count
                      ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-100"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                  }`}
                  onClick={() => setAutoPickCount(count)}
                >
                  {count} seat{count > 1 ? "s" : ""}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {seatPreferenceOptions.map((option) => (
                <Button
                  key={option.key}
                  type="button"
                  variant={activePreference === option.key ? "primary" : "secondary"}
                  loading={suggesting && activePreference === option.key}
                  onClick={() => handleAutoPick(option.key)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {suggestionInfo ? <p className="mt-3 text-xs text-cyan-300">{suggestionInfo}</p> : null}
          {suggestionMeta?.reason ? <p className="mt-1 text-xs text-slate-400">{suggestionMeta.reason}</p> : null}

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded bg-slate-900" /> Available</span>
            <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded bg-emerald-500" /> Selected</span>
            <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded bg-slate-700" /> Locked/Booked</span>
          </div>

          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Hall Occupancy</span>
              <span>{seatStats.occupancyPercent}% occupied</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-cyan-200"
                style={{ width: `${seatStats.occupancyPercent}%` }}
              />
            </div>
            <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
              <p>Available: {seatStats.available}</p>
              <p>Locked: {seatStats.locked}</p>
              <p>Booked: {seatStats.booked}</p>
            </div>
            <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
              <p>Standard: {seatTypeBreakdown.standard}</p>
              <p>Premium: {seatTypeBreakdown.premium}</p>
              <p>VIP: {seatTypeBreakdown.vip}</p>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <BookingSummary
          selectedCount={selectedSeatIds.length}
          amount={formatPrice(amount)}
          quote={selectedSeatIds.length ? quotePreview : null}
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
