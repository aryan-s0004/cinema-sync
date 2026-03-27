const Booking = require("../models/Booking");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { createOrUpdateTicketForBooking } = require("../services/ticketService");

const createPaymentOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) throw new ApiError(400, "bookingId is required");

    const booking = await Booking.findOne({ _id: bookingId, user: req.user._id });
    if (!booking) throw new ApiError(404, "Booking not found");

    if (booking.status !== "pending_payment") {
      throw new ApiError(400, `Booking status must be pending_payment. Current: ${booking.status}`);
    }

    const orderId = booking.payment?.orderId || `order_${booking._id}_${Date.now()}`;

    booking.payment = {
      ...(booking.payment || {}),
      provider: process.env.PAYMENT_PROVIDER || "mock",
      orderId,
      status: "created",
    };

    await booking.save();

    res.json(
      new ApiResponse(
        200,
        {
          bookingId: booking._id,
          orderId,
          amount: booking.totalAmount,
          currency: "INR",
        },
        "Payment order created"
      )
    );
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { bookingId, orderId, paymentId, signature } = req.body;
    if (!bookingId) throw new ApiError(400, "bookingId is required");

    const booking = await Booking.findOne({ _id: bookingId, user: req.user._id });
    if (!booking) throw new ApiError(404, "Booking not found");

    if (!booking.payment?.orderId) {
      throw new ApiError(400, "Create payment order before verification");
    }

    if (orderId && booking.payment.orderId !== orderId) {
      throw new ApiError(400, "Order mismatch for booking");
    }

    if (booking.status === "confirmed" && booking.payment?.status === "captured") {
      await booking.populate([{ path: "show", populate: [{ path: "movie" }] }, { path: "seats" }]);
      const ticket = await createOrUpdateTicketForBooking(booking, req.user);
      return res.json(new ApiResponse(200, { booking, ticket }, "Payment already verified"));
    }

    booking.payment = {
      ...(booking.payment || {}),
      paymentId: paymentId || `pay_${Date.now()}`,
      signature: signature || "mock_signature",
      status: "captured",
    };
    booking.status = "confirmed";

    await booking.save();
    await booking.populate([{ path: "show", populate: [{ path: "movie" }] }, { path: "seats" }]);
    const ticket = await createOrUpdateTicketForBooking(booking, req.user);

    res.json(
      new ApiResponse(
        200,
        {
          booking,
          ticket,
        },
        "Payment verified, booking confirmed, ticket generated"
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = { createPaymentOrder, verifyPayment };
