const BookingSummary = ({ selectedCount, amount, status, quote }) => (
  <div className="card-surface space-y-2 p-4">
    <h3 className="text-lg font-semibold text-white">Booking Summary</h3>
    <p className="text-slate-400">Seats selected: {selectedCount}</p>
    <p className="text-slate-400">Estimated amount: {amount}</p>
    {quote ? (
      <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-3 text-xs text-slate-300">
        <p>Base: ₹{quote.baseAmount}</p>
        <p>Convenience fee: ₹{quote.convenienceFee}</p>
        <p>Taxes: ₹{quote.taxes}</p>
        <p className="mt-1 font-semibold text-white">Payable: ₹{quote.totalPayable}</p>
      </div>
    ) : null}
    {status ? <p className="text-emerald-400">{status}</p> : null}
  </div>
);

export default BookingSummary;
