import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { bookingApi } from "../api/bookings";
import formatDateTime from "../utils/formatDate";
import formatPrice from "../utils/formatPrice";

const PaymentSuccessPage = () => {
  const [params] = useSearchParams();
  const txnId = params.get("txnId");
  const navigate = useNavigate();

  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingTicket, setDownloadingTicket] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    // Keep user on terminal payment state page (similar to gateway lock screens).
    window.history.pushState(null, "", window.location.href);
    const onPopState = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!txnId) {
        setError("Transaction id missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await bookingApi.paymentStatus(txnId);

        if (String(data?.paymentStatus || "").toLowerCase() === "failed") {
          navigate(`/payment/${data.bookingId}`, { replace: true });
          return;
        }

        if (!new Set(["success", "captured"]).has(String(data?.paymentStatus || "").toLowerCase())) {
          navigate(`/payment/${data.bookingId}`, { replace: true });
          return;
        }

        if (data?.booking?.show?._id) {
          bookingApi
            .upsertBookingIntent({
              showId: data.booking.show._id,
              bookingId: data.bookingId,
              paymentTransactionId: data.transactionId,
              step: "confirmation",
              active: false,
            })
            .catch(() => {});
        }

        setStatusData(data);
      } catch (err) {
        setError(err.response?.data?.message || "Could not fetch payment status");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [txnId, navigate]);

  if (loading) {
    return <p className="text-slate-300">Validating payment status...</p>;
  }

  if (error) {
    return <p className="text-rose-400">{error}</p>;
  }

  const booking = statusData?.booking;
  const ticket = statusData?.ticket;

  const handleDownloadTicket = async () => {
    if (!ticket?.ticketCode || downloadingTicket) return;

    try {
      setDownloadingTicket(true);
      setDownloadError("");
      const { blob, filename } = await bookingApi.downloadTicket(ticket.ticketCode);
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename || `${ticket.ticketCode}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setDownloadError(err.response?.data?.message || "Ticket download failed. Please try again.");
    } finally {
      setDownloadingTicket(false);
    }
  };

  return (
    <section className="mx-auto max-w-lg space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
      <h1 className="text-2xl font-semibold text-emerald-100">Payment Successful</h1>
      <p className="text-sm text-emerald-200">Your payment is securely verified and locked.</p>

      <div className="space-y-1 text-sm text-slate-100">
        <p>Transaction ID: {statusData?.transactionId}</p>
        <p>Booking ID: {statusData?.bookingId}</p>
        <p>Movie: {booking?.show?.movie?.title}</p>
        <p>Show Time: {formatDateTime(booking?.show?.showTime)}</p>
        <p>Amount: {formatPrice(booking?.totalAmount)}</p>
      </div>

      {ticket ? (
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-700/20 p-3 text-sm text-emerald-100">
          <p>Ticket Code: {ticket.ticketCode}</p>
          <p>Status: {ticket.status}</p>
          <button
            type="button"
            onClick={handleDownloadTicket}
            disabled={downloadingTicket}
            className="mt-3 rounded-lg border border-emerald-300/40 bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-50 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {downloadingTicket ? "Preparing PDF..." : "Download PDF Ticket"}
          </button>
          {downloadError ? <p className="mt-2 text-xs text-rose-200">{downloadError}</p> : null}
        </div>
      ) : null}

      <div className="flex gap-3">
        <Link to={`/confirmation/${statusData?.bookingId}`} className="text-cyan-200 hover:text-cyan-100">
          Open confirmation
        </Link>
        <Link to="/dashboard" className="text-slate-100 hover:text-white">
          Dashboard
        </Link>
      </div>
    </section>
  );
};

export default PaymentSuccessPage;
