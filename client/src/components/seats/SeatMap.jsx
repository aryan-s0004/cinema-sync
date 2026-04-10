import SeatGrid from "../booking/SeatGrid";
import SeatLegend from "./SeatLegend";

const SeatMap = ({ seats = [], selectedSeatIds = [], onToggle }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
    <p className="mb-4 text-center text-sm text-slate-500">SCREEN THIS WAY</p>
    <SeatGrid seats={seats} selectedSeatIds={selectedSeatIds} onToggle={onToggle} />
    <SeatLegend />
  </div>
);

export default SeatMap;
