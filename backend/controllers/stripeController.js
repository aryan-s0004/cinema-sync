const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Booking = require("../models/Booking");
const Seat = require("../models/Seat");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { 
  createOrUpdateTicketForBooking 
} = require("../services/ticketService");
const { 
  sendBookingConfirmationEmail, 
  sendAdminPaymentNotification 
} = require("../services/emailService");

const PAYMENT_STATE = Object.freeze({
  INITIATED: "initiated",
  PROCESSING: "processing",
  SUCCESS: "success",
  FAILED: "failed",
});

const buildQuote = (baseAmount) => {
  const normalizedBase = Math.round(Number(baseAmount || 0));
  const convenienceFee = Math.round(Math.max(15, normalizedBase * 0.03));
  const taxes = Math.round(convenienceFee * 0.18);
  const totalPayable = normalizedBase + convenienceFee + taxes;
  return {
    currency: "INR",
    baseAmount: normalizedBase,
    convenienceFee,
    taxes,
    totalPayable,
  };
};

const getStatusPayload = (booking, extra = {}) => {
  const payment = booking.payment || {};
  const quote = buildQuote(booking.totalAmount);
  return {
    bookingId: String(booking._id),
    transactionId: payment.transactionId,
    paymentStatus: payment.status,
    bookingStatus: booking.status,
    amount: booking.totalAmount,
    quote,
    clientSecret: payment.signature, // Client secret for Stripe Elements
    paymentExpiresAt: payment.paymentExpiresAt,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    ...extra,
  };
};

/**
 * Initiates a Stripe PaymentIntent for a booking.
 * Supports: Cards, UPI, Netbanking (via automatic_payment_methods)
 */
const initiatePayment = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findOne({ _id: bookingId, user: req.user._id });

    if (!booking) throw new ApiError(404, "Booking not found");
    if (booking.status !== "pending_payment") throw new ApiError(400, "Invalid booking status for payment");

    const quote = buildQuote(booking.totalAmount);
    
    // Create Stripe PaymentIntent
    // automatic_payment_methods enabled gives access to Cards, UPI, Netbanking, etc.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: quote.totalPayable * 100, // in paise
      currency: "inr",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: { 
        bookingId: String(booking._id), 
        userId: String(req.user._id),
      },
      description: `CinemaSync Booking: ${bookingId}`,
      shipping: {
        name: req.user.name,
        address: {
          line1: "CinemaSync HQ",
          city: "New Delhi",
          state: "Delhi",
          postal_code: "110001",
          country: "IN",
        }
      }
    });

    booking.payment = {
      provider: "stripe",
      transactionId: paymentIntent.id,
      status: PAYMENT_STATE.INITIATED,
      signature: paymentIntent.client_secret,
      initiatedAt: new Date(),
      paymentExpiresAt: new Date(Date.now() + 30 * 60 * 1000), 
    };

    await booking.save();

    res.json(new ApiResponse(200, getStatusPayload(booking), "Stripe Payment Intent created successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * Confirms payment status on our DB after frontend completion
 */
const confirmPayment = async (req, res, next) => {
  try {
    const { transactionId } = req.body;
    const booking = await Booking.findOne({ "payment.transactionId": transactionId, user: req.user._id });

    if (!booking) throw new ApiError(404, "Booking not found");

    const intent = await stripe.paymentIntents.retrieve(transactionId);

    if (intent.status === "succeeded") {
      if (booking.status === "confirmed") {
        return res.json(new ApiResponse(200, getStatusPayload(booking), "Payment already processed"));
      }

      booking.status = "confirmed";
      booking.payment.status = PAYMENT_STATE.SUCCESS;
      booking.payment.confirmedAt = new Date();
      await booking.save();

      await booking.populate([{ path: "show", populate: [{ path: "movie" }] }, { path: "seats" }]);
      const ticket = await createOrUpdateTicketForBooking(booking, req.user);

      if (req.user.email) {
        sendBookingConfirmationEmail({
          to: req.user.email,
          name: req.user.name,
          ticketCode: ticket.ticketCode,
          movieTitle: booking.show.movie.title,
          theatreName: booking.show.theatreName || "CinemaSync Multiplex",
          screenName: booking.show.screenName || "Screen 1",
          showTime: booking.show.showTime,
          seats: ticket.seatLabels,
          amount: booking.totalAmount,
        }).catch(e => console.error("Email fail:", e));

        sendAdminPaymentNotification({
          customerName: req.user.name,
          customerEmail: req.user.email,
          amount: booking.totalAmount,
          transactionId: intent.id,
          movieTitle: booking.show.movie.title,
        }).catch(e => console.error("Admin Notification fail:", e));
      }

      return res.json(new ApiResponse(200, { ...getStatusPayload(booking), ticket }, "CinemaSync: Payment Authorized & Ticket Issued"));
    }

    res.json(new ApiResponse(400, getStatusPayload(booking), `Gateway reports ${intent.status}`));
  } catch (error) {
    next(error);
  }
};

const getPaymentStatus = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const booking = await Booking.findOne({ "payment.transactionId": transactionId, user: req.user._id })
      .populate([{ path: "show", populate: [{ path: "movie" }] }, { path: "seats" }]);

    if (!booking) throw new ApiError(404, "Transaction record not found");

    const intent = await stripe.paymentIntents.retrieve(transactionId);
    
    let ticket = null;
    if (intent.status === "succeeded" && booking.status !== "confirmed") {
        booking.status = "confirmed";
        booking.payment.status = PAYMENT_STATE.SUCCESS;
        booking.payment.confirmedAt = new Date();
        await booking.save();
    }
    
    if (booking.status === "confirmed") {
        ticket = await createOrUpdateTicketForBooking(booking, req.user);
    }

    res.json(new ApiResponse(200, { ...getStatusPayload(booking), ticket, stripeStatus: intent.status }, "Payment Insight Synced"));
  } catch (error) {
    next(error);
  }
};

/**
 * Handled verified Stripe webhooks
 */
const handlePaymentWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Verification Failed: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const booking = await Booking.findOne({ "payment.transactionId": intent.id });
    if (booking && booking.status !== "confirmed") {
      booking.status = "confirmed";
      booking.payment.status = PAYMENT_STATE.SUCCESS;
      booking.payment.confirmedAt = new Date();
      await booking.save();
    }
  }

  res.json({ received: true });
};

module.exports = {
  initiatePayment,
  confirmPayment,
  getPaymentStatus,
  handlePaymentWebhook
};
