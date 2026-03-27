const BookingSummary = ({ selectedCount, amount, status }) => (
  <div className="card-surface space-y-2 p-4">
    <h3 className="text-lg font-semibold text-white">Booking Summary</h3>
    <p className="text-slate-400">Seats selected: {selectedCount}</p>
    <p className="text-slate-400">Estimated amount: {amount}</p>
    {status ? <p className="text-emerald-400">{status}</p> : null}
  </div>
);

export default BookingSummary;
