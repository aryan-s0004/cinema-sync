import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { bookingApi } from "../api/bookings";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import formatPrice from "../utils/formatPrice";

const sessionKey = (bookingId) => `cinemasync:payment:txn:${bookingId}`;
const successStates = new Set(["success", "captured"]);
const paymentMethods = ["upi", "card", "netbanking"];

const isValidLuhn = (value = "") => {
  const digits = String(value).replace(/\D/g, "");
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

const makeIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
};

const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [quote, setQuote] = useState(null);
  const [paymentSession, setPaymentSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("Preparing secure gateway...");
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  const [method, setMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardType, setCardType] = useState("debit");
  const [bankCode, setBankCode] = useState("");
  const [paymentOtp, setPaymentOtp] = useState("");
  const [devOtpHint, setDevOtpHint] = useState("");
  const [otpDeliveryMode, setOtpDeliveryMode] = useState("");

  const pollRef = useRef(null);

  const isPaymentSuccessful = useMemo(() => {
    const state = paymentSession?.paymentStatus || booking?.payment?.status;
    return successStates.has(String(state || "").toLowerCase());
  }, [paymentSession, booking]);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const onPopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const beforeUnload = (event) => {
      if (!paying && paymentSession?.paymentStatus !== "processing") return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [paying, paymentSession?.paymentStatus]);

  useEffect(() => {
    const boot = async () => {
      try {
        setLoading(true);
        setError("");

        const bookingData = await bookingApi.bookingById(bookingId);
        setBooking(bookingData);
        bookingApi.bookingQuote(bookingId).then(setQuote).catch(() => {});

        if (bookingData?.show?._id) {
          bookingApi
            .upsertBookingIntent({
              showId: bookingData.show._id,
              step: "payment",
              bookingId: bookingData?._id,
              seatIds: bookingData?.seats?.map((seat) => seat._id || seat) || [],
              active: true,
            })
            .catch(() => {});
        }

        const bookingPayment = bookingData?.payment || {};
        const bookingTxn = bookingPayment.transactionId;
        const storedTxn = sessionStorage.getItem(sessionKey(bookingId));
        const txnId = bookingTxn || storedTxn;

        if (successStates.has(String(bookingPayment.status || "").toLowerCase()) && txnId) {
          navigate(`/payment/success?txnId=${encodeURIComponent(txnId)}`, { replace: true });
          return;
        }

        if (txnId) {
          const statusData = await bookingApi.paymentStatus(txnId);
          setPaymentSession(statusData);
          sessionStorage.setItem(sessionKey(bookingId), statusData.transactionId || txnId);

          if (successStates.has(String(statusData.paymentStatus || "").toLowerCase())) {
            navigate(`/payment/success?txnId=${encodeURIComponent(statusData.transactionId || txnId)}`, { replace: true });
            return;
          }

          setStatusText(
            statusData.paymentStatus === "processing"
              ? "Processing your payment... Do not press back or refresh"
              : "Choose payment method and complete verification"
          );
        } else {
          const initiated = await bookingApi.initiatePayment({
            bookingId,
            idempotencyKey: makeIdempotencyKey(),
          });

          setPaymentSession(initiated);
          if (initiated.transactionId) {
            sessionStorage.setItem(sessionKey(bookingId), initiated.transactionId);
          }
          setStatusText("Select payment method and request OTP");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Unable to initialize payment");
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, [bookingId, navigate]);

  useEffect(() => {
    const expiry = paymentSession?.paymentExpiresAt;
    if (!expiry) {
      setCountdownSeconds(0);
      return undefined;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(expiry).getTime() - Date.now()) / 1000));
      setCountdownSeconds(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [paymentSession?.paymentExpiresAt]);

  useEffect(() => {
    const state = String(paymentSession?.paymentStatus || "").toLowerCase();
    if (state !== "processing") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const txnId = paymentSession?.transactionId;
        if (!txnId) return;

        const statusData = await bookingApi.paymentStatus(txnId);
        setPaymentSession(statusData);

        if (String(statusData.bookingStatus || "").toLowerCase() === "expired") {
          setError("Payment window expired. Seats are released.");
          return;
        }

        if (successStates.has(String(statusData.paymentStatus || "").toLowerCase())) {
          bookingApi
            .upsertBookingIntent({
              showId: booking?.show?._id || statusData?.booking?.show?._id,
              step: "confirmation",
              bookingId: booking?._id || statusData?.bookingId,
              paymentTransactionId: statusData?.transactionId,
              active: false,
            })
            .catch(() => {});
          clearInterval(pollRef.current);
          pollRef.current = null;
          navigate(`/payment/success?txnId=${encodeURIComponent(statusData.transactionId)}`, { replace: true });
        }
      } catch (_err) {
        // polling is best-effort
      }
    }, 2500);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [paymentSession?.paymentStatus, paymentSession?.transactionId, navigate, booking]);

  const getMethodPayload = () => {
    if (method === "upi") return { method, upiId: upiId.trim() };
    if (method === "card")
      return {
        method,
        cardType,
        cardName: cardName.trim(),
        cardNumber: cardNumber.replace(/\s+/g, ""),
        cardExpiry: cardExpiry.trim(),
        cardCvv: cardCvv.trim(),
      };
    return { method, bankCode: bankCode.trim().toUpperCase() };
  };

  const validateMethodFields = () => {
    if (method === "upi" && !upiId.trim()) return "Enter UPI ID";
    if (method === "card") {
      if (!cardName.trim() || cardName.trim().length < 2) return "Enter name on card";
      if (!isValidLuhn(cardNumber)) return "Enter valid card number";
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry.trim())) return "Expiry format should be MM/YY";
      if (!/^\d{3,4}$/.test(cardCvv.trim())) return "CVV must be 3 or 4 digits";
    }
    if (method === "netbanking" && !bankCode.trim()) return "Select bank code";
    return "";
  };

  const sendPaymentOtp = async () => {
    if (!paymentSession?.transactionId) return;
    const fieldError = validateMethodFields();
    if (fieldError) {
      setError(fieldError);
      return;
    }

    try {
      setSendingOtp(true);
      setError("");
      setDevOtpHint("");
      const response = await bookingApi.requestPaymentOtp({
        transactionId: paymentSession.transactionId,
        gatewayToken: paymentSession.gatewayToken,
        gatewayTokenExpiresAt: paymentSession.gatewayTokenExpiresAt,
        ...getMethodPayload(),
      });
      setPaymentSession((current) => ({
        ...current,
        paymentMethod: response.method,
        paymentMethodRef: response.methodRef,
        otpRequired: true,
        paymentExpiresAt: response.paymentExpiresAt || current?.paymentExpiresAt,
      }));
      setOtpDeliveryMode(response.deliveryMode || "");
      if (response?.debugOtp) {
        setDevOtpHint(`Dev OTP: ${response.debugOtp}`);
      }
      setStatusText("OTP sent. Enter OTP and complete payment.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send payment OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const completePayment = async () => {
    if (!paymentSession?.transactionId) return;

    try {
      setPaying(true);
      setError("");
      setStatusText("Processing your payment... Do not press back or refresh");

      const response = await bookingApi.confirmPayment({
        transactionId: paymentSession.transactionId,
        gatewayToken: paymentSession.gatewayToken,
        gatewayTokenExpiresAt: paymentSession.gatewayTokenExpiresAt,
        paymentId: `demo_pay_${Date.now()}`,
        paymentOtp: paymentOtp.trim(),
        method,
      });

      setPaymentSession(response);

      if (String(response.bookingStatus || "").toLowerCase() === "expired") {
        setError("Payment window expired. Seats are released.");
        setStatusText("Session expired. Please restart booking.");
        return;
      }

      if (String(response.paymentStatus || "").toLowerCase() === "failed") {
        setError("Payment failed. Please retry.");
        setStatusText("Payment failed. You can retry.");
        return;
      }

      if (successStates.has(String(response.paymentStatus || "").toLowerCase())) {
        bookingApi
          .upsertBookingIntent({
            showId: booking?.show?._id || response?.booking?.show?._id,
            step: "confirmation",
            bookingId: booking?._id || response?.bookingId,
            paymentTransactionId: response?.transactionId,
            active: false,
          })
          .catch(() => {});
        navigate(`/payment/success?txnId=${encodeURIComponent(response.transactionId)}`, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Payment confirmation failed");
      setStatusText("Payment could not be completed. Retry securely.");
    } finally {
      setPaying(false);
    }
  };

  const retryPaymentSession = async () => {
    try {
      setLoading(true);
      setError("");
      const initiated = await bookingApi.initiatePayment({
        bookingId,
        idempotencyKey: makeIdempotencyKey(),
      });

      setPaymentSession(initiated);
      setPaymentOtp("");
      if (initiated.transactionId) {
        sessionStorage.setItem(sessionKey(bookingId), initiated.transactionId);
      }
      setStatusText("New payment session created");
    } catch (err) {
      setError(err.response?.data?.message || "Could not retry payment session");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="text-slate-300">Preparing payment...</p>;
  }

  const state = String(paymentSession?.paymentStatus || "").toLowerCase();
  const hasTimer = Boolean(paymentSession?.paymentExpiresAt);
  const expired =
    String(paymentSession?.bookingStatus || booking?.status || "").toLowerCase() === "expired" ||
    (hasTimer && countdownSeconds === 0);

  return (
    <section className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <h1 className="text-2xl font-semibold text-white">Secure Checkout</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1 text-sm text-slate-300">
          <p>Booking ID: {booking?._id}</p>
          <p>Movie: {booking?.show?.movie?.title}</p>
          <p>Transaction: {paymentSession?.transactionId || "-"}</p>
          <p>Order ID: {paymentSession?.orderId || booking?.payment?.orderId || "-"}</p>
          <p className="text-cyan-200">Time left: {Math.floor(countdownSeconds / 60)}:{String(countdownSeconds % 60).padStart(2, "0")}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-200">
          <p className="font-medium text-white">Final Price Breakdown</p>
          <p>Base: {formatPrice(quote?.baseAmount ?? paymentSession?.quote?.baseAmount ?? booking?.totalAmount)}</p>
          <p>Convenience fee: {formatPrice(quote?.convenienceFee ?? paymentSession?.quote?.convenienceFee ?? 0)}</p>
          <p>Taxes: {formatPrice(quote?.taxes ?? paymentSession?.quote?.taxes ?? 0)}</p>
          <p className="mt-1 font-semibold text-cyan-200">Total payable: {formatPrice(quote?.totalPayable ?? paymentSession?.quote?.totalPayable ?? booking?.totalAmount)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-100">
        <p>{statusText}</p>
        <p className="mt-1 text-xs text-cyan-200">Do not refresh while payment is processing.</p>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <p className="text-sm font-medium text-white">Choose Payment Method</p>
        <div className="flex flex-wrap gap-2">
          {paymentMethods.map((item) => (
            <Button
              key={item}
              type="button"
              variant={method === item ? "primary" : "secondary"}
              onClick={() => setMethod(item)}
            >
              {item === "upi" ? "UPI" : item === "card" ? "Card" : "Net Banking"}
            </Button>
          ))}
        </div>

        {method === "upi" ? (
          <Input label="UPI ID" value={upiId} onChange={(event) => setUpiId(event.target.value)} placeholder="name@upi" />
        ) : null}
        {method === "card" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="mb-2 flex gap-2">
                <Button type="button" variant={cardType === "debit" ? "primary" : "secondary"} onClick={() => setCardType("debit")}>
                  Debit
                </Button>
                <Button type="button" variant={cardType === "credit" ? "primary" : "secondary"} onClick={() => setCardType("credit")}>
                  Credit
                </Button>
              </div>
              <Input label="Name on Card" value={cardName} onChange={(event) => setCardName(event.target.value)} placeholder="Aryan Sahu" />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Card Number"
                value={cardNumber}
                onChange={(event) => setCardNumber(event.target.value)}
                placeholder="4111 1111 1111 1111"
              />
            </div>
            <Input label="Expiry (MM/YY)" value={cardExpiry} onChange={(event) => setCardExpiry(event.target.value)} placeholder="12/28" />
            <Input label="CVV" value={cardCvv} onChange={(event) => setCardCvv(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" />
          </div>
        ) : null}
        {method === "netbanking" ? (
          <Input label="Bank Code" value={bankCode} onChange={(event) => setBankCode(event.target.value)} placeholder="HDFC / ICICI" />
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="button" loading={sendingOtp} disabled={expired || state === "processing"} onClick={sendPaymentOtp}>
            Send OTP
          </Button>
          <Input
            label="Payment OTP"
            value={paymentOtp}
            onChange={(event) => setPaymentOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Enter OTP"
            maxLength={6}
            className="max-w-[220px]"
          />
        </div>
        {devOtpHint ? <p className="text-xs text-amber-300">{devOtpHint}</p> : null}
        {otpDeliveryMode && otpDeliveryMode !== "smtp" ? (
          <p className="text-xs text-amber-300">Payment OTP delivery mode: {otpDeliveryMode}. Configure SMTP for real inbox OTP.</p>
        ) : null}
      </div>

      {Array.isArray(paymentSession?.timeline) && paymentSession.timeline.length ? (
        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
          <p className="mb-2 text-sm font-medium text-white">Payment Timeline</p>
          <div className="space-y-1">
            {paymentSession.timeline.map((item) => (
              <p key={item.code} className={item.completed ? "text-emerald-300" : "text-slate-400"}>
                {item.completed ? "✓" : "•"} {item.label}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <div className="flex gap-3">
        <Button
          loading={paying}
          disabled={paying || expired || isPaymentSuccessful || state === "processing"}
          className="w-full"
          onClick={completePayment}
        >
          {state === "failed" ? "Retry Payment" : "Pay Securely"}
        </Button>

        {state === "failed" || expired ? (
          <Button variant="secondary" onClick={retryPaymentSession}>
            New Session
          </Button>
        ) : null}
      </div>
    </section>
  );
};

export default PaymentPage;
