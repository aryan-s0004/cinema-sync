import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { bookingApi } from "../api/bookings";
import formatPrice from "../utils/formatPrice";

const mockPaymentMethods = [
  { key: "upi", label: "UPI" },
  { key: "card", label: "Credit / Debit" },
  { key: "netbanking", label: "Net Banking" },
];

const buildMockOtpPayload = (paymentSession, mockForm) => {
  const basePayload = {
    transactionId: paymentSession.transactionId,
    gatewayToken: paymentSession.gatewayToken,
    gatewayTokenExpiresAt: paymentSession.gatewayTokenExpiresAt,
    method: mockForm.method,
  };

  if (mockForm.method === "upi") {
    return {
      ...basePayload,
      upiId: mockForm.upiId,
    };
  }

  if (mockForm.method === "card") {
    return {
      ...basePayload,
      cardNumber: mockForm.cardNumber,
      cardName: mockForm.cardName,
      cardExpiry: mockForm.cardExpiry,
      cardCvv: mockForm.cardCvv,
      cardType: mockForm.cardType,
    };
  }

  return {
    ...basePayload,
    bankCode: mockForm.bankCode,
  };
};

const StripeCheckoutForm = ({ booking, paymentSession }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError("");

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success?bookingId=${booking._id}`,
      },
    });

    if (submitError) {
      setError(submitError.message || "Payment confirmation failed.");
      setProcessing(false);
    }
  };

  const quote = paymentSession?.quote;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Stripe Test Mode</p>
        <p className="mt-1 text-xs text-amber-100/80">
          Card: <span className="font-mono font-bold">4242 4242 4242 4242</span> &nbsp;|&nbsp; Any future expiry &nbsp;|&nbsp; Any 3-digit CVV
        </p>
        <p className="mt-0.5 text-xs text-amber-100/60">UPI: try <span className="font-mono">success@stripe</span> in the UPI field</p>
      </div>

      <PaymentElement
        options={{
          layout: "accordion",
          paymentMethodOrder: ["card", "upi"],
        }}
      />

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={processing || !stripe || !elements}
        className="w-full rounded-2xl bg-[#E50914] px-4 py-4 text-sm font-bold uppercase tracking-[0.24em] text-white transition hover:bg-[#f11a26] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {processing ? "Processing payment..." : `Pay ${formatPrice(quote?.totalPayable || 0)}`}
      </button>

      <p className="text-center text-xs text-white/45">
        Stripe securely handles card and UPI details. CinemaSync does not store raw payment credentials.
      </p>
    </form>
  );
};

const MockCheckoutForm = ({ paymentSession, onSuccess }) => {
  const [mockForm, setMockForm] = useState({
    method: "upi",
    upiId: "demo@upi",
    cardNumber: "4242424242424242",
    cardName: "CinemaSync User",
    cardExpiry: "12/30",
    cardCvv: "123",
    cardType: "credit",
    bankCode: "hdfc",
  });
  const [otpState, setOtpState] = useState(null);
  const [paymentOtp, setPaymentOtp] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setOtpState(null);
    setPaymentOtp("");
    setError("");
  }, [mockForm.method]);

  const requestOtp = async () => {
    try {
      setProcessing(true);
      setError("");
      const payload = buildMockOtpPayload(paymentSession, mockForm);
      const data = await bookingApi.requestPaymentOtp(payload);
      setOtpState(data);
      if (data?.otpPreview) {
        setPaymentOtp(data.otpPreview);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not generate payment OTP.");
    } finally {
      setProcessing(false);
    }
  };

  const confirmMockPayment = async () => {
    try {
      setProcessing(true);
      setError("");
      const data = await bookingApi.confirmPayment({
        transactionId: paymentSession.transactionId,
        gatewayToken: paymentSession.gatewayToken,
        gatewayTokenExpiresAt: paymentSession.gatewayTokenExpiresAt,
        paymentId: `mockpay_${Date.now()}`,
        paymentOtp,
        method: mockForm.method,
      });

      if (data?.bookingStatus === "confirmed") {
        onSuccess(data);
        return;
      }

      setError("Payment is still pending. Please try again.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Mock payment confirmation failed.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 rounded-[2rem] border border-[color:rgba(147,51,234,0.28)] bg-[linear-gradient(180deg,rgba(147,51,234,0.08),rgba(18,19,26,0.95))] p-6 backdrop-blur-2xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-violet-200">Secure checkout</p>
        <h2 className="mt-2 text-2xl font-black text-white">Complete your booking</h2>
        <p className="mt-2 text-sm text-white/55">
          Choose a payment method, generate the OTP, then confirm the transaction to complete your booking.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Test Credentials</p>
        <p className="mt-1 text-xs text-amber-100/80">
          Card: <span className="font-mono font-bold">4242 4242 4242 4242</span> &nbsp;|&nbsp; Expiry: any future date &nbsp;|&nbsp; CVV: any 3 digits
        </p>
        <p className="mt-0.5 text-xs text-amber-100/80">
          UPI: <span className="font-mono font-bold">success@upi</span> (success) &nbsp;|&nbsp; Net Banking: any bank
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
        {mockPaymentMethods.map((method) => (
          <button
            key={method.key}
            type="button"
            onClick={() => setMockForm((current) => ({ ...current, method: method.key }))}
            className={`rounded-xl px-3 py-3 text-xs font-bold uppercase tracking-[0.18em] transition ${
              mockForm.method === method.key ? "bg-[#E50914] text-white" : "text-white/55 hover:bg-white/5"
            }`}
          >
            {method.label}
          </button>
        ))}
      </div>

      {mockForm.method === "upi" ? (
        <label className="block text-sm text-white/75">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/40">UPI ID</span>
          <input
            type="text"
            value={mockForm.upiId}
            onChange={(event) => setMockForm((current) => ({ ...current, upiId: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-[color:rgba(147,51,234,0.5)]"
          />
        </label>
      ) : null}

      {mockForm.method === "card" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2 text-sm text-white/75">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/40">Card Number</span>
            <input
              type="text"
              value={mockForm.cardNumber}
              onChange={(event) => setMockForm((current) => ({ ...current, cardNumber: event.target.value.replace(/[^\d]/g, "").slice(0, 16) }))}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-[color:rgba(147,51,234,0.5)]"
            />
          </label>
          <label className="sm:col-span-2 text-sm text-white/75">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/40">Cardholder Name</span>
            <input
              type="text"
              value={mockForm.cardName}
              onChange={(event) => setMockForm((current) => ({ ...current, cardName: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-[color:rgba(147,51,234,0.5)]"
            />
          </label>
          <label className="text-sm text-white/75">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/40">Expiry</span>
            <input
              type="text"
              value={mockForm.cardExpiry}
              onChange={(event) => setMockForm((current) => ({ ...current, cardExpiry: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-[color:rgba(147,51,234,0.5)]"
            />
          </label>
          <label className="text-sm text-white/75">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/40">CVV</span>
            <input
              type="password"
              value={mockForm.cardCvv}
              onChange={(event) => setMockForm((current) => ({ ...current, cardCvv: event.target.value.replace(/[^\d]/g, "").slice(0, 4) }))}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-[color:rgba(147,51,234,0.5)]"
            />
          </label>
          <label className="text-sm text-white/75">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/40">Card Type</span>
            <select
              value={mockForm.cardType}
              onChange={(event) => setMockForm((current) => ({ ...current, cardType: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-cyan-300/40"
            >
              <option value="credit">Credit Card</option>
              <option value="debit">Debit Card</option>
            </select>
          </label>
        </div>
      ) : null}

      {mockForm.method === "netbanking" ? (
        <label className="block text-sm text-white/75">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/40">Bank Code</span>
          <select
            value={mockForm.bankCode}
            onChange={(event) => setMockForm((current) => ({ ...current, bankCode: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-[color:rgba(147,51,234,0.5)]"
          >
            <option value="hdfc">HDFC</option>
            <option value="icici">ICICI</option>
            <option value="sbi">SBI</option>
            <option value="axis">Axis</option>
          </select>
        </label>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <button
          type="button"
          onClick={requestOtp}
          disabled={processing}
          className="rounded-2xl border border-[color:rgba(147,51,234,0.3)] bg-[rgba(147,51,234,0.16)] px-4 py-4 text-sm font-bold uppercase tracking-[0.24em] text-violet-100 transition hover:bg-[rgba(147,51,234,0.22)] disabled:opacity-60"
        >
          {processing ? "Generating OTP..." : "Generate OTP"}
        </button>
        {otpState?.otpExpiresAt ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-xs text-white/60">
            Valid until {new Date(otpState.otpExpiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </div>
        ) : null}
      </div>

      <label className="block text-sm text-white/75">
        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/40">Payment OTP</span>
        <input
          type="text"
          value={paymentOtp}
          onChange={(event) => setPaymentOtp(event.target.value.replace(/[^\d]/g, "").slice(0, 6))}
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-[color:rgba(147,51,234,0.5)]"
          placeholder="Enter 6-digit OTP"
        />
      </label>

      {otpState?.otpPreview ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Local preview OTP: <span className="font-mono font-bold">{otpState.otpPreview}</span>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={confirmMockPayment}
        disabled={processing || !paymentOtp}
        className="w-full rounded-2xl bg-[#E50914] px-4 py-4 text-sm font-bold uppercase tracking-[0.24em] text-white transition hover:bg-[#f11a26] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {processing ? "Confirming payment..." : `Confirm ${formatPrice(paymentSession?.quote?.totalPayable || 0)}`}
      </button>
    </div>
  );
};

const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [paymentSession, setPaymentSession] = useState(null);
  const [stripeLoader, setStripeLoader] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  useEffect(() => {
    const boot = async () => {
      try {
        setLoading(true);
        setError("");

        const bookingData = await bookingApi.bookingById(bookingId);
        setBooking(bookingData);

        const session = await bookingApi.initiatePayment({
          bookingId,
          idempotencyKey: `idemp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        });

        if (session?.bookingStatus === "confirmed" && session?.transactionId) {
          navigate(`/payment/success?txnId=${encodeURIComponent(session.transactionId)}`, { replace: true });
          return;
        }

        setPaymentSession(session);

        if (session?.provider === "stripe") {
          const publishableKey = session?.publishableKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
          if (!publishableKey || !session?.clientSecret) {
            setError("Stripe publishable key is missing. Add STRIPE_PUBLISHABLE_KEY on Vercel and redeploy.");
            return;
          }

          setStripeLoader(loadStripe(publishableKey));
          return;
        }

        if (session?.provider !== "mock") {
          setError("Unsupported payment provider for this checkout session.");
        }
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Payment session initialization failed.");
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, [bookingId, navigate]);

  useEffect(() => {
    if (!paymentSession?.paymentExpiresAt) return undefined;

    const updateCountdown = () => {
      const expiresAt = new Date(paymentSession.paymentExpiresAt).getTime();
      setCountdownSeconds(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [paymentSession]);

  const quote = paymentSession?.quote;
  const category = useMemo(() => {
    if (!booking?.seats?.length) return "STANDARD";
    const types = [...new Set(booking.seats.map((seat) => seat.type || "standard"))];
    return types.length === 1 ? types[0].toUpperCase() : "COMBO";
  }, [booking]);

  const stripeOptions = useMemo(
    () => ({
      clientSecret: paymentSession?.clientSecret,
      appearance: {
        theme: "night",
        variables: {
          colorPrimary: "#E50914",
          colorBackground: "#111114",
          colorText: "#ffffff",
          colorDanger: "#f43f5e",
          borderRadius: "16px",
          fontFamily: "Outfit, Segoe UI, sans-serif",
        },
      },
    }),
    [paymentSession?.clientSecret]
  );

  const handleMockSuccess = (payload) => {
    const transactionId = payload?.transactionId || paymentSession?.transactionId;
    if (!transactionId) {
      navigate(`/confirmation/${bookingId}`, { replace: true });
      return;
    }

    navigate(`/payment/success?txnId=${encodeURIComponent(transactionId)}`, { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b0f]">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#E50914] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0f] px-4 py-10 text-white lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#E50914]">Secure checkout</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Complete your CinemaSync booking</h1>
            <p className="mt-3 max-w-xl text-sm text-white/55">
              Seats stay reserved only while your payment window is active. Finish the transaction before the timer ends.
            </p>
          </div>

          {error ? (
            <div className="rounded-[2rem] border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
              {error}
            </div>
          ) : null}

          {paymentSession?.provider === "stripe" && paymentSession?.clientSecret && stripeLoader ? (
            <Elements stripe={stripeLoader} options={stripeOptions}>
              <StripeCheckoutForm booking={booking} paymentSession={paymentSession} />
            </Elements>
          ) : null}

          {paymentSession?.provider === "mock" ? (
            <MockCheckoutForm paymentSession={paymentSession} onSuccess={handleMockSuccess} />
          ) : null}

          {!paymentSession ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-sm text-white/60">
              Payment session is not ready yet.
            </div>
          ) : null}
        </section>

        <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/35">Order summary</p>
              <h2 className="mt-2 text-2xl font-black">{booking?.show?.movie?.title}</h2>
            </div>
            <div className="rounded-full border border-[#E50914]/25 bg-[#E50914]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#ff6a72]">
              {Math.floor(countdownSeconds / 60)}:{String(countdownSeconds % 60).padStart(2, "0")}
            </div>
          </div>

          <div className="mt-6 space-y-5 text-sm text-white/70">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/35">Venue</p>
              <p className="mt-1 font-semibold text-white">{booking?.show?.theatreName || "CinemaSync Multiplex"}</p>
              <p>{booking?.show?.screenName || "Screen 1"}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/30">Seats</p>
                <p className="mt-2 font-semibold text-white">
                  {booking?.seats?.map((seat) => `${seat.row}${seat.number}`).join(", ") || "-"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/30">Category</p>
                <p className="mt-2 font-semibold text-white">{category}</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between">
                <span>Ticket subtotal</span>
                <span>{formatPrice(quote?.baseAmount || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Convenience fee</span>
                <span>{formatPrice(quote?.convenienceFee || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Taxes</span>
                <span>{formatPrice(quote?.taxes || 0)}</span>
              </div>
            </div>

            <div className="flex items-end justify-between border-t border-white/10 pt-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#E50914]">Amount payable</p>
                <p className="mt-2 text-4xl font-black text-white">{formatPrice(quote?.totalPayable || 0)}</p>
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/35">INR</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PaymentPage;
