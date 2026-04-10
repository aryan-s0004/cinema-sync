import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { bookingApi } from "../api/bookings";
import formatDateTime from "../utils/formatDate";
import formatPrice from "../utils/formatPrice";

const PaymentSuccessPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const paymentIntentId = params.get("payment_intent") || params.get("txnId");

  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingTicket, setDownloadingTicket] = useState(false);
  const hasLoaded = useRef(false);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentIntentId) {
        setError("Payment verification could not start because the transaction identifier is missing.");
        setLoading(false);
        return;
      }

      if (hasLoaded.current) return;
      hasLoaded.current = true;

      try {
        const payload = await bookingApi.paymentStatus(paymentIntentId);
        if (payload?.bookingStatus !== "confirmed") {
          setError(payload?.booking?.payment?.failureReason || "Payment is still being verified. Please check your dashboard in a moment.");
        } else {
          setStatusData(payload);
        }
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Payment verification failed. Please avoid paying twice.");
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [paymentIntentId]);

  const handleDownload = async () => {
    if (!statusData?.ticket?.ticketCode || downloadingTicket) return;

    try {
      setDownloadingTicket(true);
      const { blob, filename } = await bookingApi.downloadTicket(statusData.ticket.ticketCode);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || `${statusData.ticket.ticketCode}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Ticket download failed. Your ticket is still available in the dashboard.");
    } finally {
      setDownloadingTicket(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b]">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
          <div className="h-9 w-9 rounded-full border-4 border-emerald-400 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0b] px-6 text-center text-white">
        <div className="rounded-full bg-amber-500/15 p-6">
          <div className="h-10 w-10 rounded-full border-2 border-amber-400" />
        </div>
        <h1 className="mt-8 text-3xl font-black">Verification pending</h1>
        <p className="mt-3 max-w-xl text-sm text-white/55">{error}</p>
        <Link
          to="/dashboard"
          className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  const { booking, ticket, quote } = statusData;

  return (
    <div className="min-h-screen bg-[#0a0a0b] px-4 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-2xl">
          <div className="text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-4xl font-black text-black">
              OK
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.4em] text-emerald-300">Booking confirmed</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">{booking?.show?.movie?.title}</h1>
            <p className="mt-3 text-sm text-white/55">
              Payment has been captured successfully and your ticket is ready for download.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <section className="space-y-4 rounded-[2rem] border border-white/10 bg-black/20 p-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/35">Show</p>
                <p className="mt-2 text-xl font-bold text-white">{booking?.show?.theatreName}</p>
                <p className="text-sm text-white/60">{booking?.show?.screenName}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/35">Seats</p>
                  <p className="mt-2 text-base font-semibold text-white">{ticket?.seatLabels?.join(", ")}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/35">Show time</p>
                  <p className="mt-2 text-base font-semibold text-white">{formatDateTime(booking?.show?.showTime)}</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/35">Ticket code</p>
                <p className="mt-2 break-all font-mono text-lg text-emerald-300">{ticket?.ticketCode}</p>
              </div>
            </section>

            <aside className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/35">Payment summary</p>
              <div className="mt-5 space-y-3 text-sm text-white/70">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(quote?.baseAmount || booking?.totalAmount || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Convenience fee</span>
                  <span>{formatPrice(quote?.convenienceFee || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Taxes</span>
                  <span>{formatPrice(quote?.taxes || 0)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-4 text-base font-semibold text-white">
                  <span>Total paid</span>
                  <span>{formatPrice(quote?.totalPayable || booking?.totalAmount || 0)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={downloadingTicket}
                className="mt-8 w-full rounded-2xl bg-emerald-500 px-4 py-4 text-sm font-bold uppercase tracking-[0.24em] text-black transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {downloadingTicket ? "Generating PDF..." : "Download ticket"}
              </button>

              <div className="mt-4 flex flex-col gap-3">
                <Link
                  to="/dashboard"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  View in dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-sm font-semibold text-white/45 transition hover:text-white"
                >
                  Return home
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
