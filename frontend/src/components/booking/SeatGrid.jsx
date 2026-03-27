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
                ? "bg-emerald-500 border-emerald-400"
                : isDisabled
                  ? "bg-slate-700 border-slate-600 cursor-not-allowed"
                  : "bg-slate-900 border-slate-600 hover:border-cyan-400";

              return (
                <button
                  key={seat._id}
                  disabled={isDisabled}
                  onClick={() => onToggle(seat)}
                  className={`h-9 w-9 rounded-lg border text-xs font-semibold transition ${cls}`}
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
