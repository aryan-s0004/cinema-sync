import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { bookingApi } from "../api/bookings";
import Button from "../components/ui/Button";
import formatPrice from "../utils/formatPrice";

const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const bookingData = await bookingApi.bookingById(bookingId);
        const orderData = await bookingApi.createOrder(bookingId);

        setBooking(bookingData);
        setOrder(orderData);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to initialize payment");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [bookingId]);

  const completePayment = async () => {
    try {
      setPaying(true);
      setError("");

      await bookingApi.verifyPayment({
        bookingId,
        orderId: order?.orderId,
        paymentId: `demo_pay_${Date.now()}`,
        signature: "demo_signature"
      });

      navigate(`/confirmation/${bookingId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Payment verification failed");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <p className="text-slate-300">Preparing payment...</p>;
  }

  return (
    <section className="mx-auto max-w-lg space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <h1 className="text-2xl font-semibold text-white">Payment</h1>

      <div className="space-y-1 text-sm text-slate-300">
        <p>Booking ID: {booking?._id}</p>
        <p>Movie: {booking?.show?.movie?.title}</p>
        <p>Amount: {formatPrice(booking?.totalAmount)}</p>
        <p>Order ID: {order?.orderId}</p>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <Button loading={paying} className="w-full" onClick={completePayment}>
        Pay Now (Mock)
      </Button>
    </section>
  );
};

export default PaymentPage;
