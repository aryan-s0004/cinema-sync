const ApiResponse = require("../utils/ApiResponse");
const logger = require("../utils/logger");
const paymentService = require("../services/paymentService");
const { sendBookingConfirmationEmail, sendAdminPaymentNotification } = require("../services/emailService");

const sendPostPaymentNotifications = async (payload, user) => {
  const ticket = payload?.ticket;
  const booking = payload?.booking;
  if (!ticket || !booking || !user?.email) {
    return;
  }

  await sendBookingConfirmationEmail({
    to: user.email,
    name: user.name,
    ticketCode: ticket.ticketCode,
    movieTitle: booking.show?.movie?.title,
    theatreName: booking.show?.theatreName || "CinemaSync Multiplex",
    screenName: booking.show?.screenName || "Screen 1",
    showTime: booking.show?.showTime,
    seats: ticket.seatLabels,
    amount: booking.totalAmount,
  }).catch((error) => {
    logger.warn("Booking confirmation email failed", { message: error.message, bookingId: String(booking._id) });
  });

  await sendAdminPaymentNotification({
    customerName: user.name,
    customerEmail: user.email,
    amount: booking.totalAmount,
    transactionId: payload.transactionId,
    movieTitle: booking.show?.movie?.title || "Movie",
  }).catch((error) => {
    logger.warn("Admin payment notification failed", { message: error.message, bookingId: String(booking._id) });
  });
};

const initiatePayment = async (req, res, next) => {
  try {
    const data = await paymentService.initiatePayment({
      bookingId: req.body.bookingId,
      userId: req.user._id,
      idempotencyKey: req.body.idempotencyKey || req.headers["x-idempotency-key"] || null,
    });

    res.json(new ApiResponse(200, data, "Payment session created"));
  } catch (error) {
    next(error);
  }
};

const requestPaymentOtp = async (req, res, next) => {
  try {
    const data = await paymentService.requestPaymentOtp({
      userId: req.user._id,
      ...req.body,
    });

    res.json(new ApiResponse(200, data, "Payment OTP generated"));
  } catch (error) {
    next(error);
  }
};

const confirmPayment = async (req, res, next) => {
  try {
    const data = await paymentService.confirmPayment({
      userId: req.user._id,
      ...req.body,
    });

    if (data?.bookingStatus === "confirmed" && !data?.idempotent) {
      await sendPostPaymentNotifications(data, req.user);
    }

    res.json(new ApiResponse(200, data, data?.bookingStatus === "confirmed" ? "Payment confirmed" : "Payment updated"));
  } catch (error) {
    next(error);
  }
};

const getPaymentStatus = async (req, res, next) => {
  try {
    const data = await paymentService.getPaymentStatus({
      userId: req.user._id,
      transactionId: req.params.transactionId,
    });

    res.json(new ApiResponse(200, data, "Payment status fetched"));
  } catch (error) {
    next(error);
  }
};

const handleMockWebhook = async (req, res, next) => {
  try {
    const data = await paymentService.handleMockWebhook(req.body);
    res.json(new ApiResponse(200, data, "Mock payment webhook processed"));
  } catch (error) {
    next(error);
  }
};

const handlePaymentWebhook = async (req, res, next) => {
  try {
    const data = await paymentService.handleStripeWebhook({
      rawBody: req.rawBody,
      signature: req.headers["stripe-signature"],
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initiatePayment,
  requestPaymentOtp,
  confirmPayment,
  getPaymentStatus,
  handleMockWebhook,
  handlePaymentWebhook,
};
