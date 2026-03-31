import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { bookingApi } from "../api/bookings";
import formatDateTime from "../utils/formatDate";
import formatPrice from "../utils/formatPrice";

const PaymentSuccessPage = () => {
  const [params] = useSearchParams();
  const txnId = params.get("txnId") || params.get("payment_intent");
  const navigate = useNavigate();

  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingTicket, setDownloadingTicket] = useState(false);

  const initialLoadDone = useRef(false);

  useEffect(() => {
    const verify = async () => {
      if (!txnId) {
        setError("Security check failed: Transaction ID missing.");
        setLoading(false);
        return;
      }

      if (initialLoadDone.current) return;
      initialLoadDone.current = true;

      try {
        setLoading(true);
        // Step 1: Verify the payment status with backend (which internally checks Stripe)
        const data = await bookingApi.paymentStatus(txnId);

        if (data?.paymentStatus === "success" || data?.paymentStatus === "captured" || data?.stripeStatus === "succeeded") {
          setStatusData(data);
        } else {
          setError("Authorized but pending confirmation. Please check your email or dashboard in a few minutes.");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Transaction verification in progress. Do not pay twice.");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [txnId]);

  const handleDownload = async () => {
    if (!statusData?.ticket?.ticketCode || downloadingTicket) return;
    try {
      setDownloadingTicket(true);
      const { blob, filename } = await bookingApi.downloadTicket(statusData.ticket.ticketCode);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || `Ticket_${statusData.ticket.ticketCode}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("PDF generation failed. You can find your ticket in the dashboard.");
    } finally {
      setDownloadingTicket(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0b]">
       <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
       </motion.div>
       <p className="mt-6 text-white/50 font-black uppercase tracking-[0.3em] text-[10px]">Verifying Secure Transaction...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0b] p-6 text-center">
       <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mb-8">
          <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
       </div>
       <h1 className="text-2xl font-black mb-2">PARTIAL TRANSACTION</h1>
       <p className="text-white/40 max-w-md mx-auto mb-10">{error}</p>
       <Link to="/dashboard" className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold transition-all">Go to Dashboard</Link>
    </div>
  );

  const { booking, ticket } = statusData;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-6 lg:p-20 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full pointer-events-none opacity-20">
         <div className="absolute top-1/4 left-0 w-96 h-96 bg-[#E50914] rounded-full blur-[150px]" />
         <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-emerald-500 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16">
           <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(16,185,129,0.4)] border-4 border-[#0a0a0b]">
              <svg className="w-12 h-12 text-[#0a0a0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
           </div>
           <h1 className="text-5xl font-black tracking-tighter mb-4">BOOKING <span className="text-emerald-500">CONFIRMED</span></h1>
           <p className="text-white/40 font-bold uppercase tracking-[0.25em] text-xs">Payment Authorization Successful via Stripe®</p>
        </motion.div>

        {/* Digital Ticket Representation */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl mb-12">
           <div className="p-8 border-b border-dashed border-white/10 relative">
              {/* Notches */}
              <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-[#0a0a0b] rounded-full" />
              <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-[#0a0a0b] rounded-full" />
              
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <div className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">CINEMASYNC E-TICKET</div>
                    <h2 className="text-2xl font-black tracking-tight">{booking?.show?.movie?.title}</h2>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">{booking?.show?.theatreName || "CinemaSync Multiplex"}</p>
                 </div>
                 <div className="text-right">
                    <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">TRANS ID</div>
                    <div className="text-[10px] font-mono font-bold text-white/60">#RS_{txnId.slice(-8).toUpperCase()}</div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-8 text-sm">
                 <div>
                    <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest block mb-1">Seats</label>
                    <span className="font-black text-emerald-500">{ticket?.seatLabels?.join(", ") || booking?.seats?.map(s => `${s.row || ""}${s.number || ""}`).join(", ")}</span>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest block mb-1">Showtime</label>
                    <span className="font-bold">{formatDateTime(booking?.show?.showTime)}</span>
                 </div>
              </div>
           </div>

           <div className="p-8 pt-10 text-center">
              <div className="bg-white p-4 rounded-3xl inline-block mb-6 shadow-xl">
                 {/* Placeholder for QR - usually generated via library but using visual representation here */}
                 <div className="w-32 h-32 bg-cover opacity-80" style={{backgroundImage: `url('https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${ticket?.ticketCode || "error"}')`}} />
              </div>
              <div className="text-xl font-mono font-black tracking-[0.4em] mb-8 text-white/80">{ticket?.ticketCode || "CONFIRMED"}</div>
              
              <button 
                onClick={handleDownload}
                disabled={downloadingTicket}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-black font-black flex items-center justify-center gap-3 rounded-2xl transition-all shadow-xl shadow-emerald-500/20"
              >
                {downloadingTicket ? "GENERATING PDF..." : "DOWNLOAD PDF TICKET"}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
           </div>
        </motion.div>

        <div className="flex flex-col gap-4">
           <Link to="/dashboard" className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">
              Track in Dashboard
           </Link>
           <button onClick={() => navigate('/')} className="text-sm font-bold text-white/30 hover:text-white transition-colors uppercase tracking-[0.2em]">Return to Home</button>
        </div>

        <p className="mt-12 text-center text-[10px] text-white/20 font-bold uppercase tracking-[0.3em]">Confirmation email sent to your registered address</p>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
