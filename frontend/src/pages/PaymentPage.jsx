import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createOrder, getBookingById, verifyPayment } from "../api/bookingApi";

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
        const bookingData = await getBookingById(bookingId);
        setBooking(bookingData);
        const orderData = await createOrder(bookingId);
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
    setPaying(true);
    setError("");
    try {
      await verifyPayment({
        bookingId,
        orderId: order?.orderId,
        paymentId: `demo_pay_${Date.now()}`,
        signature: "demo_signature",
      });
      navigate(`/confirmation/${bookingId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Payment verification failed");
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <p>Preparing payment...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <section>
      <h1>Payment</h1>
      <div className="card narrow">
        <p>Booking ID: {booking?._id}</p>
        <p>Amount: Rs. {booking?.totalAmount}</p>
        <p>Order: {order?.orderId}</p>
        <button className="button" disabled={paying} onClick={completePayment}>
          {paying ? "Verifying..." : "Pay Now (Mock)"}
        </button>
      </div>
    </section>
  );
};

export default PaymentPage;
