import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { bookingApi } from "../api/bookings";
import Button from "../components/ui/Button";

const SeatSelectionPage = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [suggestionType, setSuggestionType] = useState(null);
  const [seatCount, setSeatCount] = useState(2);
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
        const normalizedSeats = Array.isArray(seatData) ? seatData : [];
        setShow(showData);
        setSeats(normalizedSeats);
        
        // Auto-select seats that are already locked by the current user (isMine=true)
        // This handles "Refresh" and "Resume Booking" perfectly.
        const mine = normalizedSeats.filter(s => s.isMine).map(s => s._id);
        if (mine.length > 0) {
          setSelectedSeatIds(mine);
          setSeatCount(mine.length);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load seats");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showId]);

  const toggleSeat = (seatId) => {
    setSelectedSeatIds((current) =>
      current.includes(seatId)
        ? current.filter((id) => id !== seatId)
        : [...current, seatId]
    );
    setSuggestionType(null); 
  };

  // Sync selection to BookingIntent so "Resume" flow works on Home Page
  useEffect(() => {
    if (selectedSeatIds.length > 0 && showId) {
      const syncIntent = async () => {
        try {
          await bookingApi.upsertBookingIntent({
            showId,
            seatIds: selectedSeatIds,
            step: "seat_selection",
            active: true
          });
        } catch (err) {
          console.warn("Intent sync failed", err);
        }
      };
      
      const timer = setTimeout(syncIntent, 1500); // Debounced sync
      return () => clearTimeout(timer);
    }
  }, [selectedSeatIds, showId]);

  const handleSuggestion = useCallback((pref) => {
    setSuggestionType(pref);
    const sortedRowKeys = Object.keys(groupedSeats).sort((a, b) => a.localeCompare(b));
    if (!sortedRowKeys.length) return;

    const totalRowsCount = sortedRowKeys.length;
    let targetRows = [];

    // --- RE-ENGINEERED ZONING (Strict & Accurate) ---
    if (pref === "front") {
      // Front is strictly the first 25-30% of rows (A, B...)
      const endIdx = Math.max(1, Math.floor(totalRowsCount * 0.3));
      targetRows = sortedRowKeys.slice(0, endIdx);
    } else if (pref === "back") {
      // Back is strictly the last 25-30% of rows
      const startIdx = Math.max(0, totalRowsCount - Math.ceil(totalRowsCount * 0.3));
      targetRows = [...sortedRowKeys.slice(startIdx)].reverse(); // Reverse to pick the absolute last rows first
    } else if (pref === "center") {
      // Center is the middle-most slice
      const start = Math.floor(totalRowsCount * 0.35);
      const end = Math.ceil(totalRowsCount * 0.65);
      targetRows = sortedRowKeys.slice(start, end);
    } else if (pref === "premium") {
      // Strictly VIP/Premium tier rows
      targetRows = sortedRowKeys.filter(row => 
        groupedSeats[row].some(s => s.type === "premium" || s.type === "vip")
      );
    } else if (pref === "budget") {
      // Strictly Standard tier rows
      targetRows = sortedRowKeys.filter(row => 
        groupedSeats[row].some(s => s.type === "standard")
      );
    }

    let found = [];
    
    // We iterate through target rows in order.
    // For "Front", we check Row A first, then B, etc.
    for (const row of targetRows) {
      const rowSeats = [...groupedSeats[row]].sort((a, b) => a.number - b.number);
      const rowLen = rowSeats.length;

      // Smart Scan: We start checking from the middle of the row (best view)
      // then expand outwards to the edges.
      const mid = Math.floor(rowLen / 2);
      const searchIndices = [];
      for (let offset = 0; offset <= rowLen; offset++) {
        const left = mid - offset;
        const right = mid + offset - (seatCount % 2 === 0 ? 1 : 0);
        
        // This generates a list of starting indices that prioritize centricity
        if (left >= 0 && !searchIndices.includes(left)) searchIndices.push(left);
        if (right >=0 && right <= rowLen - seatCount && !searchIndices.includes(right)) searchIndices.push(right);
      }

      for (const startIdx of searchIndices) {
        if (startIdx < 0 || startIdx + seatCount > rowLen) continue;
        const chunk = rowSeats.slice(startIdx, startIdx + seatCount);
        
        // Type verification for Tiered selections
        const typeMatch = pref === "premium" 
          ? chunk.every(s => s.type === "premium" || s.type === "vip")
          : pref === "budget"
          ? chunk.every(s => s.type === "standard")
          : true;

        if (typeMatch && chunk.every(s => s.status.toLowerCase() === "available")) {
          found = chunk.map(s => s._id);
          break;
        }
      }
      if (found.length) break;
    }

    if (found.length) {
      setSelectedSeatIds(found);
      setError(""); // Clear any previous error
    } else {
      setError(`No contiguous ${seatCount} seats found in ${pref.toUpperCase()} zone.`);
      setTimeout(() => setError(""), 3000);
    }
  }, [groupedSeats, seatCount]);

  const lockAndBook = async () => {
    if (!selectedSeatIds.length) {
      setError("Please select seats to continue");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      await bookingApi.lockSeats({ showId, seatIds: selectedSeatIds });
      const booking = await bookingApi.createBooking({ showId, seatIds: selectedSeatIds });
      navigate(`/payment/${booking._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Selection lock expired. Please refresh.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="w-12 h-12 border-4 border-t-[#E50914] border-white/5 rounded-full animate-spin" />
      <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] animate-pulse">Syncing Seat Status</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      {show && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-900/40 rounded-3xl border border-white/5 backdrop-blur-xl">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">{show.movie?.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-black text-[#E50914] tracking-[0.3em] uppercase">{show.theatreName}</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-[10px] font-black text-white/40 tracking-[0.3em] uppercase">IMAX SCREEN</span>
            </div>
          </div>
          <div className="mt-4 md:mt-0 text-right">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Digital Entry</p>
            <p className="text-sm font-black text-white italic tracking-tighter uppercase">{new Date(show.showTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
          </div>
        </motion.div>
      )}

      {/* Suggestion Engine */}
      <section className="bg-slate-900/40 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white/5">
        <div className="grid md:grid-cols-[1fr_auto] gap-8 items-end">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E50914]">1. Choose Seats</h3>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map(num => (
                <button 
                  key={num} 
                  onClick={() => setSeatCount(num)}
                  className={`w-11 h-11 rounded-2xl text-xs font-black transition-all border-none cursor-pointer ${seatCount === num ? "bg-[#E50914] text-white shadow-[0_0_20px_rgba(229,9,20,0.3)]" : "bg-white/5 text-white/30 hover:bg-white/10"}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 md:text-right">2. Smart Preference</h3>
            <div className="flex flex-wrap gap-2 justify-end">
              {["front", "center", "back", "premium", "budget"].map(pref => (
                <button 
                  key={pref}
                  onClick={() => handleSuggestion(pref)}
                  className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border-none cursor-pointer ${suggestionType === pref ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]" : "bg-white/5 text-white/40 hover:bg-white/10"}`}
                >
                  {pref}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Seat Grid */}
      <div className="relative p-10 bg-black/60 rounded-[3.5rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-1 bg-[#E50914]/40 blur-md" />
        <div className="abs-center -top-4 w-60 h-10 border-b border-white/5 rounded-[50%] blur-sm" />
        <p className="text-[10px] font-black text-white/10 text-center tracking-[1.5em] mb-16 uppercase italic">Cinema Horizon</p>

        <div className="space-y-5">
          {Object.keys(groupedSeats).sort().map((row) => (
            <div key={row} className="flex items-center justify-center gap-6">
              <span className="w-8 text-[10px] font-black text-white/10 italic text-right">{row}</span>
              <div className="flex gap-2">
                {groupedSeats[row].map((seat) => {
                  const isSelected = selectedSeatIds.includes(seat._id);
                  // A seat is only effectively locked if it's NOT available AND not the user's own selection
                  const isLockedByOthers = seat.status !== "available" && !seat.isMine;
                  return (
                    <button
                      key={seat._id}
                      onClick={() => !isLockedByOthers && toggleSeat(seat._id)}
                      disabled={isLockedByOthers}
                      className={`
                        w-8 h-8 md:w-9 md:h-9 rounded-xl text-[9px] font-black transition-all border-none cursor-pointer
                        ${isLockedByOthers 
                          ? "bg-white/2 text-transparent opacity-10 cursor-not-allowed" 
                          : isSelected 
                            ? "bg-[#10b981] text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-110" 
                            : "bg-white/5 text-white/30 hover:bg-[#E50914]/30 hover:text-white"
                         }
                      `}
                    >
                      {seat.number}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-8 border-t border-white/5 pt-10">
           <div className="flex items-center gap-3">
             <div className="w-4 h-4 rounded-lg bg-white/10" />
             <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Open</span>
           </div>
           <div className="flex items-center gap-3">
             <div className="w-4 h-4 rounded-lg bg-[#10b981]" />
             <span className="text-[10px] font-black text-[#10b981] uppercase tracking-widest">Pick</span>
           </div>
           <div className="flex items-center gap-3">
             <div className="w-4 h-4 rounded-lg bg-white/5 opacity-20" />
             <span className="text-[10px] font-black text-white/10 uppercase tracking-widest">Locked</span>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-[#E50914]/10 border border-[#E50914]/20 text-[#E50914] rounded-2xl text-[10px] font-black uppercase tracking-widest text-center italic">
             SYSTEM NOTICE: {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Checkout Sidebar/Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0b]/95 backdrop-blur-3xl border-t border-white/5 p-8 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-10">
          <div>
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-1">Live Reservation</p>
            <p className="text-xl font-black text-white italic tracking-tighter uppercase truncate">
              {selectedSeatIds.length} SLOTS SECURED <span className="text-white/10 mx-3">|</span> 
              <span className="text-[#10b981]">₹{(show?.price || 0) * selectedSeatIds.length}</span>
            </p>
          </div>
          <Button 
            onClick={lockAndBook} 
            loading={processing} 
            disabled={!selectedSeatIds.length || processing}
            className="rounded-2xl px-12 py-5 bg-[#E50914] text-white font-black italic tracking-widest scale-100 hover:scale-105 transition-all text-xs border-none outline-none shadow-[0_0_40px_rgba(229,9,20,0.4)]"
          >
            CONFIRM SEATS
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SeatSelectionPage;

