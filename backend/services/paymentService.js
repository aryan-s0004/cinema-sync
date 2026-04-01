const crypto = require("crypto");
const Stripe = require("stripe");
const Booking = require("../models/Booking");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");
const { apiKeys, hasStripeSecrets } = require("../config/apiKeys");
const bookingService = require("./bookingService");

const PAYMENT_PROVIDER = String(process.env.PAYMENT_PROVIDER || "mock").trim().toLowerCase();
const PAYMENT_OTP_EXPIRY_MINUTES = Math.max(Number(process.env.PAYMENT_OTP_EXPIRY_MINUTES || 3), 1);
const PAYMENT_DEBUG_PREVIEW =
  process.env.NODE_ENV !== "production" ||
  String(process.env.PAYMENT_DEBUG_PREVIEW || process.env.OTP_DEBUG_PREVIEW || "false").toLowerCase() === "true";

let stripeClient = null;

const getStripeClient = () => {
  if (!hasStripeSecrets()) {
    throw new ApiError(500, "Stripe keys are not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(apiKeys.stripeSecretKey);
  }

  return stripeClient;
};

const generateOpaqueToken = (prefix) => `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const getEffectiveProvider = (booking) => {
  if (booking?.payment?.provider === "stripe" || booking?.payment?.provider === "mock") {
    return booking.payment.provider;
  }

  if (PAYMENT_PROVIDER === "stripe" && hasStripeSecrets()) {
    return "stripe";
  }

  return "mock";
};

const ensurePendingBooking = (booking) => {
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.status === "confirmed") {
    return;
  }

  if (booking.status !== "pending_payment") {
    throw new ApiError(400, "Invalid booking status for payment");
  }
};

const getMockGatewayExpiry = (booking) => booking.payment?.gatewayTokenExpiresAt || booking.payment?.paymentExpiresAt;

const buildStatusPayload = async (booking, extra = {}) => {
  const populatedBooking = await bookingService.populateBooking(Booking.findById(booking._id));
  const ticket = populatedBooking.status === "confirmed"
    ? await require("./ticketService").createOrUpdateTicketForBooking(
        populatedBooking,
        await User.findById(populatedBooking.user).select("_id name email")
      )
    : null;

  return bookingService.buildPaymentPayload({
    booking: populatedBooking,
    ticket,
    extra: {
      provider: getEffectiveProvider(populatedBooking),
      transactionId: populatedBooking.payment?.transactionId || null,
      orderId: populatedBooking.payment?.orderId || null,
      gatewayToken: populatedBooking.payment?.gatewayToken || null,
      gatewayTokenExpiresAt: populatedBooking.payment?.gatewayTokenExpiresAt || null,
      clientSecret: populatedBooking.payment?.signature || null,
      publishableKey: apiKeys.stripePublishableKey || null,
      ...extra,
    },
  });
};

const validateMockGateway = (booking, { gatewayToken, gatewayTokenExpiresAt }) => {
  const currentGatewayToken = booking.payment?.gatewayToken;
  if (!currentGatewayToken || gatewayToken !== currentGatewayToken) {
    throw new ApiError(401, "Payment session token mismatch");
  }

  const expiresAt = getMockGatewayExpiry(booking);
  const claimedExpiry = gatewayTokenExpiresAt ? new Date(gatewayTokenExpiresAt) : null;
  if (!expiresAt || Number.isNaN(new Date(expiresAt).getTime())) {
    throw new ApiError(400, "Payment session is missing expiry");
  }

  const effectiveExpiry = claimedExpiry && !Number.isNaN(claimedExpiry.getTime()) ? claimedExpiry : new Date(expiresAt);
  if (effectiveExpiry.getTime() < Date.now()) {
    throw new ApiError(410, "Payment session expired. Please create a new booking.");
  }
};

const ensureStripeCustomer = async (stripe, userDoc) => {
  if (!userDoc?._id) {
    throw new ApiError(400, "User is required for Stripe payment");
  }

  const normalizedEmail = String(userDoc.email || "").trim().toLowerCase() || undefined;
  const normalizedName = String(userDoc.name || "").trim() || undefined;

  if (userDoc.stripeCustomerId) {
    try {
      const existingCustomer = await stripe.customers.retrieve(userDoc.stripeCustomerId);
      if (existingCustomer && !existingCustomer.deleted) {
        const updatePayload = {};
        if (normalizedEmail && existingCustomer.email !== normalizedEmail) {
          updatePayload.email = normalizedEmail;
        }
        if (normalizedName && existingCustomer.name !== normalizedName) {
          updatePayload.name = normalizedName;
        }

        if (Object.keys(updatePayload).length) {
          await stripe.customers.update(existingCustomer.id, updatePayload);
        }

        return existingCustomer.id;
      }
    } catch (error) {
      if (error?.code !== "resource_missing") {
        throw error;
      }

      logger.warn("Stored Stripe customer missing, recreating", {
        userId: String(userDoc._id),
        stripeCustomerId: userDoc.stripeCustomerId,
      });
    }
  }

  const customer = await stripe.customers.create({
    email: normalizedEmail,
    name: normalizedName,
    metadata: {
      userId: String(userDoc._id),
    },
  });

  userDoc.stripeCustomerId = customer.id;
  await userDoc.save();

  return customer.id;
};

const initiateMockPayment = async (booking, idempotencyKey = null) => {
  const now = new Date();
  const freshExpiry = new Date(now.getTime() + bookingService.PAYMENT_WINDOW_MINUTES * 60 * 1000);
  const reuseExisting =
    booking.payment?.transactionId &&
    booking.payment?.orderId &&
    getMockGatewayExpiry(booking) &&
    new Date(getMockGatewayExpiry(booking)).getTime() > now.getTime();

  if (!reuseExisting) {
    booking.payment = {
      ...(booking.payment || {}),
      provider: "mock",
      orderId: booking.payment?.orderId || generateOpaqueToken("order"),
      transactionId: booking.payment?.transactionId || generateOpaqueToken("txn"),
      gatewayToken: generateOpaqueToken("gk"),
      gatewayTokenExpiresAt: freshExpiry,
      status: bookingService.BOOKING_PAYMENT_STATE.INITIATED,
      idempotencyKey: idempotencyKey || booking.payment?.idempotencyKey || null,
      initiatedAt: booking.payment?.initiatedAt || now,
      paymentExpiresAt: freshExpiry,
      attempts: Number(booking.payment?.attempts || 0) + 1,
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
      failureReason: null,
      failedAt: null,
    };
    await booking.save();
  }

  return buildStatusPayload(booking, {
    message: "Mock payment initiated",
  });
};

const initiateStripePayment = async (booking, userDoc, idempotencyKey = null) => {
  const stripe = getStripeClient();
  const quote = bookingService.buildQuote(booking.totalAmount, booking.seats.length);
  const customerId = await ensureStripeCustomer(stripe, userDoc);

  if (
    booking.payment?.provider === "stripe" &&
    booking.payment?.transactionId &&
    booking.payment?.signature &&
    booking.payment?.paymentExpiresAt &&
    new Date(booking.payment.paymentExpiresAt).getTime() > Date.now()
  ) {
    return buildStatusPayload(booking);
  }

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: quote.totalPayable * 100,
      currency: "inr",
      automatic_payment_methods: { enabled: true },
      customer: customerId,
      receipt_email: userDoc.email || undefined,
      metadata: {
        bookingId: String(booking._id),
        userId: String(userDoc._id),
      },
      description: `CinemaSync Booking: ${booking._id}`,
    },
    idempotencyKey ? { idempotencyKey } : undefined
  );

  booking.payment = {
    ...(booking.payment || {}),
    provider: "stripe",
    transactionId: paymentIntent.id,
    signature: paymentIntent.client_secret,
    status: bookingService.BOOKING_PAYMENT_STATE.INITIATED,
    idempotencyKey: idempotencyKey || booking.payment?.idempotencyKey || null,
    initiatedAt: new Date(),
    paymentExpiresAt: new Date(Date.now() + bookingService.PAYMENT_WINDOW_MINUTES * 60 * 1000),
    attempts: Number(booking.payment?.attempts || 0) + 1,
    failureReason: null,
    failedAt: null,
  };
  await booking.save();

  return buildStatusPayload(booking);
};

const initiatePayment = async ({ bookingId, userId, idempotencyKey = null }) => {
  const booking = await bookingService.getOwnedBooking(bookingId, userId);
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.status === "confirmed") {
    return buildStatusPayload(booking, { idempotent: true });
  }

  ensurePendingBooking(booking);

  if (getEffectiveProvider(booking) === "stripe") {
    const userDoc = await User.findById(userId).select("_id name email stripeCustomerId");
    return initiateStripePayment(booking, userDoc, idempotencyKey);
  }

  return initiateMockPayment(booking, idempotencyKey);
};

const requestPaymentOtp = async ({ userId, transactionId, gatewayToken, gatewayTokenExpiresAt, method }) => {
  const booking = await Booking.findOne({ "payment.transactionId": transactionId, user: userId });
  if (booking?.status === "confirmed") {
    throw new ApiError(400, "Payment already completed");
  }
  ensurePendingBooking(booking);

  if (getEffectiveProvider(booking) !== "mock") {
    throw new ApiError(400, "OTP challenge is supported only for mock payment provider");
  }

  validateMockGateway(booking, { gatewayToken, gatewayTokenExpiresAt });
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + PAYMENT_OTP_EXPIRY_MINUTES * 60 * 1000);

  booking.payment = {
    ...(booking.payment || {}),
    method,
    otpHash: hashOtp(otp),
    otpExpiresAt: expiresAt,
    otpAttempts: 0,
    processingAt: new Date(),
  };
  await booking.save();

  return {
    bookingId: String(booking._id),
    transactionId,
    method,
    otpExpiresAt: expiresAt,
    otpPreview: PAYMENT_DEBUG_PREVIEW ? otp : undefined,
  };
};

const succeedBookingPayment = async (booking, paymentUpdates = {}) => {
  const userDoc = await User.findById(booking.user).select("_id name email");
  return bookingService.confirmBookingPayment(booking, userDoc, paymentUpdates);
};

const failBookingPayment = async (booking, reason, status = "cancelled") => {
  await bookingService.markBookingAsFailed(booking, reason, status);
  return buildStatusPayload(booking);
};

const confirmMockPayment = async ({
  userId,
  transactionId,
  gatewayToken,
  gatewayTokenExpiresAt,
  paymentId,
  paymentOtp,
  method,
  forceStatus,
}) => {
  const booking = await Booking.findOne({ "payment.transactionId": transactionId, user: userId });
  ensurePendingBooking(booking);
  validateMockGateway(booking, { gatewayToken, gatewayTokenExpiresAt });

  if (booking.status === "confirmed" || booking.payment?.status === bookingService.BOOKING_PAYMENT_STATE.SUCCESS) {
    return buildStatusPayload(booking, { idempotent: true });
  }

  if (booking.payment?.otpHash) {
    if (!booking.payment.otpExpiresAt || new Date(booking.payment.otpExpiresAt).getTime() < Date.now()) {
      return failBookingPayment(booking, "Payment OTP expired");
    }

    if (hashOtp(paymentOtp || "") !== booking.payment.otpHash) {
      booking.payment.otpAttempts = Number(booking.payment.otpAttempts || 0) + 1;
      await booking.save();
      throw new ApiError(400, "Invalid payment OTP");
    }
  }

  if (String(forceStatus || "").toLowerCase() === "failed") {
    return failBookingPayment(booking, "Payment was declined by the gateway");
  }

  const { booking: confirmedBooking, ticket } = await succeedBookingPayment(booking, {
    paymentId: paymentId || transactionId,
    method: method || booking.payment?.method || null,
    status: bookingService.BOOKING_PAYMENT_STATE.SUCCESS,
    confirmedAt: new Date(),
    otpHash: null,
    otpExpiresAt: null,
    otpAttempts: 0,
  });

  return bookingService.buildPaymentPayload({
    booking: confirmedBooking,
    ticket,
    extra: {
      provider: "mock",
      transactionId: confirmedBooking.payment?.transactionId,
      orderId: confirmedBooking.payment?.orderId,
      gatewayToken: confirmedBooking.payment?.gatewayToken,
      gatewayTokenExpiresAt: confirmedBooking.payment?.gatewayTokenExpiresAt,
      paymentId: paymentId || transactionId,
    },
  });
};

const confirmStripePayment = async ({ userId, transactionId }) => {
  const stripe = getStripeClient();
  const booking = await Booking.findOne({ "payment.transactionId": transactionId, user: userId });
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.status === "confirmed" || booking.payment?.status === bookingService.BOOKING_PAYMENT_STATE.SUCCESS) {
    return buildStatusPayload(booking, {
      provider: "stripe",
      idempotent: true,
    });
  }

  const intent = await stripe.paymentIntents.retrieve(transactionId);
  if (intent.status === "succeeded") {
    const { booking: confirmedBooking, ticket } = await succeedBookingPayment(booking, {
      paymentId: intent.id,
      status: bookingService.BOOKING_PAYMENT_STATE.SUCCESS,
      confirmedAt: new Date(),
    });

    return bookingService.buildPaymentPayload({
      booking: confirmedBooking,
      ticket,
      extra: {
        provider: "stripe",
        stripeStatus: intent.status,
        transactionId: intent.id,
        clientSecret: confirmedBooking.payment?.signature,
        publishableKey: apiKeys.stripePublishableKey || null,
      },
    });
  }

  if (["canceled", "requires_payment_method"].includes(intent.status)) {
    return failBookingPayment(booking, `Gateway reports ${intent.status}`);
  }

  return buildStatusPayload(booking, {
    provider: "stripe",
    stripeStatus: intent.status,
  });
};

const confirmPayment = async (payload) => {
  const booking = await Booking.findOne({ "payment.transactionId": payload.transactionId, user: payload.userId });
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (getEffectiveProvider(booking) === "stripe") {
    return confirmStripePayment(payload);
  }

  return confirmMockPayment(payload);
};

const getPaymentStatus = async ({ userId, transactionId }) => {
  const booking = await Booking.findOne({ "payment.transactionId": transactionId, user: userId });
  if (!booking) {
    throw new ApiError(404, "Transaction record not found");
  }

  if (getEffectiveProvider(booking) === "stripe") {
    return confirmStripePayment({ userId, transactionId });
  }

  return buildStatusPayload(booking);
};

const verifyMockWebhookSignature = ({ orderId, paymentId, status, eventId, signature }) => {
  const secret = apiKeys.paymentWebhookSecret;
  if (!secret) {
    throw new ApiError(500, "PAYMENT_WEBHOOK_SECRET is not configured");
  }

  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}|${status}|${eventId}`).digest("hex");
  if (signature !== expected) {
    throw new ApiError(403, "Webhook signature verification failed");
  }
};

const handleMockWebhook = async ({ orderId, paymentId, status, signature, eventId }) => {
  verifyMockWebhookSignature({ orderId, paymentId, status, signature, eventId });

  const booking = await Booking.findOne({ "payment.orderId": orderId });
  if (!booking) {
    throw new ApiError(404, "Booking not found for order");
  }

  const previousEventIds = Array.isArray(booking.payment?.webhookEventIds) ? booking.payment.webhookEventIds : [];
  if (previousEventIds.includes(eventId)) {
    const duplicatePayload = await buildStatusPayload(booking, {
      idempotent: true,
      duplicateEvent: true,
    });
    duplicatePayload.ticketCode = duplicatePayload.ticket?.ticketCode || null;
    return duplicatePayload;
  }

  booking.payment = {
    ...(booking.payment || {}),
    paymentId,
    webhookEventIds: [...previousEventIds, eventId],
    webhookReceivedAt: new Date(),
  };
  await booking.save();

  if (status === "failed") {
    return failBookingPayment(booking, "Mock webhook marked payment as failed");
  }

  const { booking: confirmedBooking, ticket } = await succeedBookingPayment(booking, {
    paymentId,
    status: bookingService.BOOKING_PAYMENT_STATE.SUCCESS,
    confirmedAt: new Date(),
  });

  const payload = bookingService.buildPaymentPayload({
    booking: confirmedBooking,
    ticket,
    extra: {
      provider: "mock",
      duplicateEvent: false,
      idempotent: false,
    },
  });
  payload.ticketCode = ticket.ticketCode;
  return payload;
};

const handleStripeWebhook = async ({ rawBody, signature }) => {
  const stripe = getStripeClient();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, apiKeys.stripeWebhookSecret);
  } catch (error) {
    throw new ApiError(400, `Webhook Verification Failed: ${error.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const booking = await Booking.findOne({ "payment.transactionId": intent.id });
    if (booking) {
      await succeedBookingPayment(booking, {
        paymentId: intent.id,
        status: bookingService.BOOKING_PAYMENT_STATE.SUCCESS,
        confirmedAt: new Date(),
      });
    }
  }

  if (["payment_intent.canceled", "payment_intent.payment_failed"].includes(event.type)) {
    const intent = event.data.object;
    const booking = await Booking.findOne({ "payment.transactionId": intent.id });
    if (booking) {
      await bookingService.markBookingAsFailed(booking, `Stripe webhook reported ${event.type}`);
    }
  }

  return { received: true };
};

module.exports = {
  initiatePayment,
  requestPaymentOtp,
  confirmPayment,
  getPaymentStatus,
  handleMockWebhook,
  handleStripeWebhook,
};
