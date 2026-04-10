import formatPrice from "../../utils/formatPrice";

const BookingSummary = ({ selectedCount, amount, status, quote }) => (
  <div className="space-y-3 rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,19,26,0.96),rgba(11,11,15,0.96))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
    <h3 className="text-lg font-black uppercase tracking-[0.16em] text-white">Booking Summary</h3>
    <p className="text-sm text-white/60">Seats selected: {selectedCount}</p>
    <p className="text-sm text-white/60">Estimated amount: {amount}</p>
    {quote ? (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        <p>Base: {formatPrice(quote.baseAmount)}</p>
        <p>Convenience fee: {formatPrice(quote.convenienceFee)}</p>
        <p>Taxes: {formatPrice(quote.taxes)}</p>
        <p className="mt-2 font-bold text-white">Payable: {formatPrice(quote.totalPayable)}</p>
      </div>
    ) : null}
    {status ? <p className="text-sm font-semibold text-[color:var(--cs-red)]">{status}</p> : null}
  </div>
);

export default BookingSummary;
