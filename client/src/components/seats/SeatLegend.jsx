const SeatLegend = () => (
  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
    <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded bg-slate-900" /> Available</span>
    <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded bg-emerald-500" /> Selected</span>
    <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded bg-slate-700" /> Locked/Booked</span>
  </div>
);

export default SeatLegend;
