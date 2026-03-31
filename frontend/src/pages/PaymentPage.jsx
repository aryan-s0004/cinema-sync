import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { bookingApi } from "../api/bookings";
import Button from "../components/ui/Button";
import formatPrice from "../utils/formatPrice";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckoutForm = ({ booking, paymentSession, countdownSeconds }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [saveCard, setSaveCard] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError("");

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success?bookingId=${booking._id}`,
        setup_future_usage: saveCard ? "off_session" : undefined,
      },
    });

    if (submitError) {
      setError(`PAYMENT FAILED: ${submitError.message || "Unauthorized Transaction"}.`);
      setProcessing(false);
    }
  };

  const quote = paymentSession?.quote || booking?.quote;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement options={{ 
        layout: "accordion", 
        theme: "night",
        variables: { colorPrimary: "#E50914" } 
      }} />

      <div className="flex items-center gap-3">
        <input 
           type="checkbox" 
           id="saveCard" 
           checked={saveCard}
           onChange={(e) => setSaveCard(e.target.checked)}
           className="accent-[#E50914] w-4 h-4 cursor-pointer" 
        />
        <label htmlFor="saveCard" className="text-sm font-medium text-white/70 tracking-wide cursor-pointer">Save card for future purchases</label>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex flex-col gap-2">
          <span>⚠ {error}</span>
        </div>
      )}

      <button disabled={processing || !stripe || !elements} className="w-full py-4 bg-[#E50914] hover:bg-[#FF1522] text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(229,9,20,0.39)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 tracking-wider">
        {processing ? "Processing payment..." : (error ? "Retry Payment" : `Pay ${formatPrice(quote?.totalPayable || 0)}`)}
      </button>

      <p className="text-xs text-center text-white/40 pt-2">
        Stripe handles this authentication securely. We never store your raw card details.
      </p>
    </form>
  );
};

const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [paymentSession, setPaymentSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  useEffect(() => {
    const boot = async () => {
      try {
        setLoading(true);
        const b = await bookingApi.bookingById(bookingId);
        setBooking(b);
        
        const s = await bookingApi.initiatePayment({ 
          bookingId, 
          idempotencyKey: `idemp_${Date.now()}_${Math.random().toString(36).slice(2)}` 
        });
        setPaymentSession(s);
      } catch (err) {
        setError("Payment session initialization failed. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, [bookingId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (paymentSession?.paymentExpiresAt) {
        setCountdownSeconds(Math.max(0, Math.floor((new Date(paymentSession.paymentExpiresAt).getTime() - Date.now()) / 1000)));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [paymentSession]);

  const category = useMemo(() => {
    if (!booking?.seats?.length) return "STANDARD";
    const types = [...new Set(booking.seats.map(s => s.type))];
    if (types.length === 1) return types[0].toUpperCase();
    return "COMBO";
  }, [booking]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0b] gap-6">
       <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-16 h-16 border-4 border-[#E50914] border-t-transparent rounded-full shadow-[0_0_20px_rgba(229,9,20,0.4)]" />
       <p className="text-[#E50914] font-black uppercase tracking-[0.3em] text-xs animate-pulse">Initializing CinemaGateway...</p>
    </div>
  );

  const quote = paymentSession?.quote || booking?.quote;
  const stripeOptions = {
    clientSecret: paymentSession?.clientSecret,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#E50914',
        colorBackground: '#1a1a1e',
        colorText: '#ffffff',
        colorDanger: '#df1b41',
        fontFamily: 'Outfit, Segoe UI, sans-serif',
        spacingUnit: '4px',
        borderRadius: '12px',
      },
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 lg:p-12 overflow-x-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Column - Payment Gateway */}
        <div className="lg:col-span-7">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div className="mb-12">
              <h1 className="text-5xl font-black tracking-tighter mb-4">POWERED BY <span className="text-[#E50914]">STRIPE</span></h1>
              <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-[#10b981]">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" /> SECURE HANDSHAKE OK</span>
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" /> PCI DSS COMPLIANT</span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {paymentSession?.clientSecret ? (
                <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-[350px]">
                  <Elements stripe={stripePromise} options={stripeOptions}>
                    <CheckoutForm 
                      booking={booking} 
                      paymentSession={paymentSession} 
                      countdownSeconds={countdownSeconds} 
                    />
                  </Elements>
                </motion.div>
              ) : (
                <div key="loading" className="p-20 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-6">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-10 h-10 border-2 border-white/10 border-t-[#E50914] rounded-full" />
                  <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Requesting Secure Tunnel...</p>
                </div>
              )}
            </AnimatePresence>

            <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-3 gap-8 opacity-60 hover:opacity-100 transition-all filter brightness-125">
               <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-6 mx-auto" alt="Paypal" />
               <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Mastercard_2019_logo.svg" className="h-8 mx-auto" alt="Mastercard" />
               <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-4 mx-auto my-auto" alt="Visa" />
            </div>
          </motion.div>
        </div>

        {/* Right Column - Order Info */}
        <div className="lg:col-span-5">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="sticky top-12">
            <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#E50914]/5 rounded-full blur-[100px] -mr-32 -mt-32" />
              
              <div className="flex justify-between items-center mb-10 pb-6 border-b border-white/5">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Order Info</h2>
                <div className="px-4 py-1.5 bg-[#E50914]/10 border border-[#E50914]/20 rounded-full flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-[#E50914] animate-ping" />
                   <span className="text-[10px] font-black text-[#E50914] tracking-widest">{Math.floor(countdownSeconds / 60)}:{String(countdownSeconds % 60).padStart(2, "0")} LEFT</span>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <div className="text-[9px] font-black text-[#E50914] uppercase tracking-[0.4em] mb-3">EXPERIENCE SELECTION</div>
                  <h3 className="text-2xl font-black mb-1 leading-tight">{booking?.show?.movie?.title}</h3>
                  <p className="text-sm font-bold text-white/40 uppercase tracking-widest">{booking?.show?.theatreName || "CinemaSync Multiplex"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <div className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5">SEATS</div>
                      <div className="text-sm font-bold text-[#E50914] truncate">
                        {booking?.seats?.map(s => `${s.row}${s.number}`).join(", ") || "A1, A2"}
                      </div>
                   </div>
                   <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <div className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5">CATEGORY</div>
                      <div className="text-sm font-bold truncate tracking-widest">{category}</div>
                   </div>
                </div>

                <div className="space-y-4 pt-6 text-[11px] font-bold uppercase tracking-widest text-white/40">
                  <div className="flex justify-between">
                    <span>Ticket sub total</span>
                    <span className="text-white font-mono">{formatPrice(quote?.baseAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cinema Convenience (3%)</span>
                    <span className="text-white font-mono">{formatPrice(quote?.convenienceFee || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Govt Tax (18% GST)</span>
                    <span className="text-white font-mono">{formatPrice(quote?.taxes || 0)}</span>
                  </div>
                </div>

                <div className="my-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <div className="flex justify-between items-end">
                   <div>
                      <div className="text-[9px] font-black text-[#E50914] uppercase tracking-[0.3em] mb-2">AMOUNT PAYABLE</div>
                      <div className="text-5xl font-black tracking-tighter">{formatPrice(quote?.totalPayable || 0)}</div>
                   </div>
                   <div className="mb-1 text-white/20 font-black text-xs">INR</div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center items-center gap-3">
               <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.908L8 2.053V9.5L2.166 12.355V4.908zm15.668 0L12 2.053V9.5l5.834 2.855V4.908zM1.4 12.871l6.6 3.235V17.5L1.4 14.166v-1.295zm17.2 0l-6.6 3.235V17.5l6.6-3.334v-1.295zM10 11.233l6.5-3.181V4.896L10 8.016 3.5 4.896v3.156L10 11.233z" /></svg>
               <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">Live Verification via Stripe®</span>
            </div>
          </motion.div>
        </div>

      </div>
      
      {error && (
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-[#E50914] text-white px-8 py-4 rounded-full shadow-2xl font-bold flex items-center gap-3">
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
           {error}
        </motion.div>
      )}
    </div>
  );
};

export default PaymentPage;
