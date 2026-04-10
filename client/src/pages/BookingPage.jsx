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

  const [countdown, setCountdown] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!lockUntil) {
      setCountdown("");
      setIsExpired(false);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(lockUntil);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown("EXPIRED");
        setIsExpired(true);
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${mins}:${secs.toString().padStart(2, "0")} LEFT`);
      setIsExpired(false);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [lockUntil]);

  useEffect(() => {
    if (isExpired && selectedSeatIds.length > 0) {
      refetchSeats().catch(() => {});
    }
  }, [isExpired, refetchSeats, selectedSeatIds.length]);

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
    }, 500);

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

  if (loadingShow && seatsLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#E50914] border-t-transparent" />
        <p className="text-xs font-black uppercase tracking-[0.5em] text-white/20 animate-pulse">Loading Show</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">Seat Selection</h1>

        {loadingShow ? (
          <div className="h-24 animate-pulse rounded-2xl border border-white/5 bg-white/5" />
        ) : null}
        {showError ? (
          <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{showError}</p>
        ) : null}
        {show ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,19,26,0.96),rgba(11,11,15,0.96))] p-5 text-sm text-slate-300 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
            <p className="text-lg font-black uppercase italic text-white">{show.movie?.title}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-[#E50914]">{show.theatreName}</p>
            <p className="text-xs text-slate-500">{show.screenName}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
              <span>{formatDateTime(show.showTime)}</span>
              <span className="text-slate-600">|</span>
              <span>{formatShowWindow(show.showTime, show?.movie?.duration || 150)}</span>
              <span className="text-slate-600">|</span>
              <span className="font-bold text-white">{formatPrice(show.price)} / seat</span>
            </div>
            <p className="mt-3 rounded-xl border border-[color:rgba(147,51,234,0.35)] bg-[rgba(147,51,234,0.12)] px-3 py-2 text-xs text-violet-200">{showtimeInsight}</p>
          </div>
        ) : null}

        {seatsLoading ? (
          <div className="h-64 animate-pulse rounded-3xl border border-white/5 bg-white/5" />
        ) : null}
        {seatsError ? (
          <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{seatsError}</p>
        ) : null}

        <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,19,26,0.92),rgba(11,11,15,0.92))] p-6 backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="h-px flex-1 bg-white/5" />
            <p className="text-[10px] font-black uppercase tracking-[0.8em] text-white/10">Screen</p>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          <SeatGrid seats={seats} selectedSeatIds={selectedSeatIds} onToggle={toggleSeatSelection} />

          <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-violet-200">Smart Seat Suggestion</p>
            <p className="mt-1 text-xs text-slate-400">Choose seat count and preference, then let AI pick the best contiguous cluster.</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`rounded-md border px-2.5 py-1 text-xs transition ${
                    autoPickCount === count
                      ? "border-[color:rgba(147,51,234,0.65)] bg-[rgba(147,51,234,0.18)] text-violet-100"
                      : "border-white/10 bg-black/20 text-slate-300 hover:border-white/25"
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

          {suggestionInfo ? <p className="mt-3 text-xs text-violet-200">{suggestionInfo}</p> : null}
          {suggestionMeta?.reason ? <p className="mt-1 text-xs text-slate-400">{suggestionMeta.reason}</p> : null}

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded bg-[color:var(--cs-purple)]" /> Available</span>
            <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded bg-[color:var(--cs-red)]" /> Selected</span>
            <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded bg-slate-700" /> Locked/Booked</span>
          </div>

          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Hall Occupancy</span>
              <span>{seatStats.occupancyPercent}% occupied</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[color:var(--cs-purple)] via-fuchsia-400 to-[color:var(--cs-red)]"
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
          status={countdown || (selectedSeatIds.length ? "Securing Seats..." : "Select seats to continue")}
        />

        {isExpired && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-center">
             <p className="text-sm font-bold text-rose-400 uppercase tracking-widest italic">Session Terminated</p>
             <p className="mt-1 text-xs text-rose-300/60">Your seat lock has expired. Please re-select your seats to continue.</p>
             <Button variant="secondary" className="mt-4 w-full" onClick={() => window.location.reload()}>Refresh Sessions</Button>
          </div>
        )}
        {selectedSeats.length ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
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
