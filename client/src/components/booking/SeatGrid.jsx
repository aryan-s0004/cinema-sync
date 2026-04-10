const SeatGrid = ({ seats = [], selectedSeatIds = [], onToggle }) => {
  const grouped = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row].push(seat);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.keys(grouped)
        .sort()
        .map((row) => (
          <div key={row} className="flex flex-wrap items-center gap-2">
            <span className="w-5 text-sm font-bold text-slate-400">{row}</span>
            {grouped[row].map((seat) => {
              const selected = selectedSeatIds.includes(seat._id);
              const isDisabled = seat.status !== "available";
              const cls = selected
                ? "border-[color:var(--cs-red)] bg-[color:var(--cs-red)] text-white shadow-[0_0_0_1px_rgba(229,9,20,0.35),0_20px_40px_rgba(229,9,20,0.18)]"
                : isDisabled
                  ? "cursor-not-allowed border-white/10 bg-white/10 text-white/35"
                  : "border-[color:rgba(147,51,234,0.28)] bg-[linear-gradient(180deg,rgba(147,51,234,0.18),rgba(18,19,26,0.95))] text-white hover:-translate-y-0.5 hover:border-[color:rgba(147,51,234,0.7)] hover:shadow-[0_16px_30px_rgba(147,51,234,0.18)]";

              return (
                <button
                  key={seat._id}
                  disabled={isDisabled}
                  onClick={() => onToggle(seat)}
                  className={`h-10 w-10 rounded-xl border text-xs font-black transition ${cls}`}
                >
                  {seat.number}
                </button>
              );
            })}
          </div>
        ))}
    </div>
  );
};

export default SeatGrid;
