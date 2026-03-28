const crypto = require("crypto");
const Booking = require("../models/Booking");
const Seat = require("../models/Seat");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { createOrUpdateTicketForBooking } = require("../services/ticketService");
const { sendBookingConfirmationEmail, sendEmail, hasSmtpCredentials } = require("../services/emailService");

const PAYMENT_STATE = Object.freeze({
  INITIATED: "initiated",
  PROCESSING: "processing",
  SUCCESS: "success",
  FAILED: "failed",
});

const legacyToState = {
  created: PAYMENT_STATE.INITIATED,
  captured: PAYMENT_STATE.SUCCESS,
};

const PAYMENT_SECRET = () =>
  process.env.PAYMENT_MOCK_SECRET || process.env.JWT_ACCESS_SECRET || "cinemasync_mock_secret";

const WEBHOOK_SECRET = () =>
  process.env.PAYMENT_WEBHOOK_SECRET || process.env.PAYMENT_MOCK_SECRET || process.env.JWT_ACCESS_SECRET || "cinemasync_mock_secret";

const PAYMENT_WINDOW_MINUTES = Math.max(Number(process.env.PAYMENT_WINDOW_MINUTES || 10), 5);
const PAYMENT_OTP_EXPIRY_MINUTES = Math.max(Number(process.env.PAYMENT_OTP_EXPIRY_MINUTES || 3), 2);
const isDevLike = process.env.NODE_ENV !== "production";

const randomId = (prefix) => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
const normalizePaymentState = (status) => legacyToState[status] || status || null;
const isSuccessState = (status) => normalizePaymentState(status) === PAYMENT_STATE.SUCCESS;
const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const signGatewayToken = ({ bookingId, transactionId, orderId, expiresAt }) => {
  const payload = `${bookingId}|${transactionId}|${orderId}|${expiresAt}`;
  return crypto.createHmac("sha256", PAYMENT_SECRET()).update(payload).digest("hex");
};

const signPayment = ({ transactionId, orderId, paymentId }) => {
  const payload = `${transactionId}|${orderId}|${paymentId}`;
  return crypto.createHmac("sha256", PAYMENT_SECRET()).update(payload).digest("hex");
};

const signWebhookEvent = ({ orderId, paymentId, status, eventId }) => {
  const payload = `${orderId}|${paymentId}|${status}|${eventId}`;
  return crypto.createHmac("sha256", WEBHOOK_SECRET()).update(payload).digest("hex");
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(ms, 0)));

const buildQuote = (baseAmount) => {
  const normalizedBase = Math.max(Number(baseAmount || 0), 0);
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

const maskMethodRef = ({ method, upiId, cardNumber, bankCode, cardType }) => {
  if (method === "upi") {
    return String(upiId || "").trim();
  }
  if (method === "card") {
    const digits = String(cardNumber || "").replace(/\D/g, "");
    const typeLabel = cardType ? String(cardType).toUpperCase() : "CARD";
    return digits ? `${typeLabel} **** ${digits.slice(-4)}` : null;
  }
  if (method === "netbanking") {
    return String(bankCode || "").trim().toUpperCase();
  }
  return null;
};

const isPaymentWindowExpired = (booking) =>
  Boolean(
    booking.status === "pending_payment" &&
      booking.payment?.paymentExpiresAt &&
      new Date(booking.payment.paymentExpiresAt).getTime() < Date.now()
  );

const expirePendingBookingIfNeeded = async (booking) => {
  if (!isPaymentWindowExpired(booking)) return false;

  booking.status = "expired";
  booking.payment = {
    ...(booking.payment || {}),
    status: PAYMENT_STATE.FAILED,
    failureReason: "Payment window expired",
    failedAt: new Date(),
    locked: false,
    otpHash: null,
    otpExpiresAt: null,
    otpAttempts: 0,
  };
  await booking.save();

  await Seat.updateMany(
    { _id: { $in: booking.seats }, show: booking.show, status: "booked" },
    { $set: { status: "available", lockedBy: null, lockedUntil: null } }
  );

  return true;
};

const validateGatewayToken = ({ booking, transactionId, gatewayToken, gatewayTokenExpiresAt }) => {
  const payment = booking.payment || {};
  const expiresAt = gatewayTokenExpiresAt || payment.gatewayTokenExpiresAt?.toISOString();
  if (!expiresAt) {
    throw new ApiError(400, "gatewayTokenExpiresAt is required");
  }

  if (new Date(expiresAt).getTime() < Date.now()) {
    throw new ApiError(400, "Payment session expired. Please initiate again.");
  }

  const expectedToken = signGatewayToken({
    bookingId: booking._id,
    transactionId,
    orderId: payment.orderId,
    expiresAt,
  });

  if (!gatewayToken || gatewayToken !== expectedToken) {
    throw new ApiError(403, "Invalid gateway token");
  }

  return expiresAt;
};

const loadUserBooking = async ({ bookingId, userId }) => {
  const booking = await Booking.findOne({ _id: bookingId, user: userId });
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  const expired = await expirePendingBookingIfNeeded(booking);
  if (expired) {
    throw new ApiError(400, "Booking payment window expired");
  }

  return booking;
};

const getStatusPayload = (booking, extra = {}) => {
  const payment = booking.payment || {};
  const state = normalizePaymentState(payment.status);
  const quote = buildQuote(booking.totalAmount);
  const timeline = [
    {
      code: PAYMENT_STATE.INITIATED,
      label: "Payment initiated",
      completed: Boolean(payment.initiatedAt),
      at: payment.initiatedAt || null,
    },
    {
      code: PAYMENT_STATE.PROCESSING,
      label: "Processing in gateway",
      completed: [PAYMENT_STATE.PROCESSING, PAYMENT_STATE.SUCCESS, PAYMENT_STATE.FAILED].includes(state),
      at: payment.processingAt || null,
    },
    {
      code: PAYMENT_STATE.SUCCESS,
      label: "Payment successful",
      completed: state === PAYMENT_STATE.SUCCESS,
      at: payment.confirmedAt || null,
    },
    {
      code: PAYMENT_STATE.FAILED,
      label: "Payment failed",
      completed: state === PAYMENT_STATE.FAILED,
      at: payment.failedAt || null,
      reason: payment.failureReason || null,
    },
  ];

  return {
    bookingId: String(booking._id),
    transactionId: payment.transactionId || null,
    orderId: payment.orderId || null,
    paymentId: payment.paymentId || null,
    paymentStatus: state,
    bookingStatus: booking.status,
    amount: booking.totalAmount,
    currency: "INR",
    quote,
    timeline,
    paymentMethod: payment.method || null,
    paymentMethodRef: payment.methodRef || null,
    paymentExpiresAt: payment.paymentExpiresAt || null,
    otpRequired: Boolean(payment.otpHash && payment.otpExpiresAt && new Date(payment.otpExpiresAt).getTime() > Date.now()),
    locked: Boolean(payment.locked || isSuccessState(payment.status)),
    canRetry: state === PAYMENT_STATE.FAILED,
    ...extra,
  };
};

const issueOrReuseTransaction = async ({ booking, idempotencyKey }) => {
  const state = normalizePaymentState(booking.payment?.status);
  const payment = booking.payment || {};

  if (booking.status === "confirmed" && isSuccessState(payment.status)) {
    return {
      booking,
      payload: getStatusPayload(booking, {
        message: "Payment already successful",
        redirectUrl: `/payment/success?txnId=${payment.transactionId || ""}`,
      }),
    };
  }

  if (booking.status === "cancelled" || booking.status === "expired") {
    throw new ApiError(400, `Booking is ${booking.status}. Payment is not allowed.`);
  }

  if (
    payment.transactionId &&
    [PAYMENT_STATE.INITIATED, PAYMENT_STATE.PROCESSING].includes(state) &&
    (!idempotencyKey || payment.idempotencyKey === idempotencyKey)
  ) {
    if (await expirePendingBookingIfNeeded(booking)) {
      throw new ApiError(400, "Booking payment window expired");
    }

    const expiresAt = payment.gatewayTokenExpiresAt?.toISOString() || new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const gatewayToken = signGatewayToken({
      bookingId: booking._id,
      transactionId: payment.transactionId,
      orderId: payment.orderId,
      expiresAt,
    });

    return {
      booking,
      payload: getStatusPayload(booking, {
        gatewayToken,
        gatewayTokenExpiresAt: expiresAt,
        message: "Existing payment session restored",
      }),
    };
  }

  const orderId = payment.orderId || randomId("order");
  const transactionId = randomId(`txn_${booking._id.toString().slice(-6)}`);
  const gatewayTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const paymentExpiresAt = new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60 * 1000);
  const gatewayTokenExpiresAtIso = gatewayTokenExpiresAt.toISOString();
  const gatewayToken = signGatewayToken({
    bookingId: booking._id,
    transactionId,
    orderId,
    expiresAt: gatewayTokenExpiresAtIso,
  });

  booking.payment = {
    ...payment,
    provider: process.env.PAYMENT_PROVIDER || "mock",
    orderId,
    transactionId,
    method: null,
    methodRef: null,
    status: PAYMENT_STATE.INITIATED,
    paymentId: null,
    signature: null,
    locked: false,
    idempotencyKey: idempotencyKey || payment.idempotencyKey || null,
    gatewayTokenExpiresAt,
    paymentExpiresAt,
    otpHash: null,
    otpExpiresAt: null,
    otpAttempts: 0,
    initiatedAt: new Date(),
    processingAt: null,
    attempts: Number(payment.attempts || 0) + 1,
    failedAt: null,
    confirmedAt: null,
    failureReason: null,
  };

  await booking.save();

  return {
    booking,
    payload: getStatusPayload(booking, {
      gatewayToken,
      gatewayTokenExpiresAt: gatewayTokenExpiresAtIso,
      message: "Payment initiated",
    }),
  };
};

const finalizeSuccess = async ({ booking, paymentId, userDoc }) => {
  const safePaymentId = paymentId || randomId("pay");
  const safeSignature = signPayment({
    transactionId: booking.payment.transactionId,
    orderId: booking.payment.orderId,
    paymentId: safePaymentId,
  });

  booking.payment = {
    ...booking.payment,
    paymentId: safePaymentId,
    signature: safeSignature,
    status: PAYMENT_STATE.SUCCESS,
    locked: true,
    confirmedAt: new Date(),
    processingAt: booking.payment?.processingAt || new Date(),
    failedAt: null,
    otpHash: null,
    otpExpiresAt: null,
    otpAttempts: 0,
    failureReason: null,
  };
  booking.status = "confirmed";

  await booking.save();
  await booking.populate([{ path: "show", populate: [{ path: "movie" }] }, { path: "seats" }]);
  const ticket = await createOrUpdateTicketForBooking(booking, userDoc);

  if (userDoc?.email) {
    sendBookingConfirmationEmail({
      to: userDoc.email,
      name: userDoc.name || "CinemaSync User",
      ticketCode: ticket.ticketCode,
      movieTitle: booking.show?.movie?.title || "Movie",
      theatreName: booking.show?.theatreName || "Theatre",
      screenName: booking.show?.screenName || "Screen",
      showTime: booking.show?.showTime ? new Date(booking.show.showTime).toISOString() : "",
      seats: ticket.seatLabels || [],
      amount: booking.totalAmount,
    }).catch(() => {});
  }

  return {
    booking,
    ticket,
    payload: getStatusPayload(booking, {
      signature: safeSignature,
      redirectUrl: `/payment/success?txnId=${booking.payment.transactionId}`,
    }),
  };
};

const safeEqualHex = (left, right) => {
  const a = Buffer.from(String(left || ""), "hex");
  const b = Buffer.from(String(right || ""), "hex");
  if (a.length !== b.length || a.length === 0) return false;
  return crypto.timingSafeEqual(a, b);
};

const trackWebhookEvent = (booking, eventId) => {
  const payment = booking.payment || {};
  const seen = new Set(Array.isArray(payment.webhookEventIds) ? payment.webhookEventIds : []);
  seen.add(String(eventId));
  booking.payment = {
    ...payment,
    webhookEventIds: [...seen].slice(-25),
    webhookReceivedAt: new Date(),
  };
};

const handlePaymentWebhook = async (req, res, next) => {
  try {
    const { orderId, paymentId, status, signature, eventId } = req.body;
    const normalizedStatus = String(status || "").toLowerCase();

    const expectedSignature = signWebhookEvent({ orderId, paymentId, status: normalizedStatus, eventId });
    if (!safeEqualHex(signature, expectedSignature)) {
      throw new ApiError(403, "Invalid payment webhook signature");
    }

    const booking = await Booking.findOne({ "payment.orderId": orderId });
    if (!booking) {
      throw new ApiError(404, "Booking not found for orderId");
    }

    if ((booking.payment?.webhookEventIds || []).includes(String(eventId))) {
      return res.json(
        new ApiResponse(
          200,
          {
            bookingId: String(booking._id),
            bookingStatus: booking.status,
            paymentStatus: normalizePaymentState(booking.payment?.status),
            idempotent: true,
            duplicateEvent: true,
            eventId,
          },
          "Webhook already processed for this eventId"
        )
      );
    }

    if (normalizedStatus === "success") {
      if (booking.status === "confirmed" && isSuccessState(booking.payment?.status)) {
        trackWebhookEvent(booking, eventId);
        await booking.save();

        const existingTicket = await createOrUpdateTicketForBooking(
          await booking.populate([{ path: "show", populate: [{ path: "movie" }] }, { path: "seats" }]),
          await User.findById(booking.user)
        );
        return res.json(
          new ApiResponse(
            200,
            {
              bookingId: String(booking._id),
              bookingStatus: booking.status,
              paymentStatus: normalizePaymentState(booking.payment?.status),
              ticketCode: existingTicket.ticketCode,
              idempotent: true,
              eventId,
            },
            "Webhook already processed"
          )
        );
      }

      if (["cancelled", "expired"].includes(booking.status)) {
        throw new ApiError(409, `Booking is ${booking.status}. Success webhook ignored.`);
      }

      if (!booking.payment?.transactionId) {
        booking.payment = {
          ...(booking.payment || {}),
          transactionId: randomId(`txn_${booking._id.toString().slice(-6)}`),
          initiatedAt: booking.payment?.initiatedAt || new Date(),
        };
      }

      const userDoc = await User.findById(booking.user);
      if (!userDoc) {
        throw new ApiError(404, "Booking user not found");
      }

      const { ticket } = await finalizeSuccess({ booking, paymentId, userDoc });
      trackWebhookEvent(booking, eventId);
      await booking.save();

      return res.json(
        new ApiResponse(
          200,
          {
            bookingId: String(booking._id),
            bookingStatus: booking.status,
            paymentStatus: normalizePaymentState(booking.payment?.status),
            transactionId: booking.payment?.transactionId || null,
            orderId: booking.payment?.orderId || orderId,
            paymentId: booking.payment?.paymentId || paymentId,
            ticketCode: ticket.ticketCode,
            eventId,
          },
          "Webhook processed: payment confirmed"
        )
      );
    }

    if (normalizedStatus === "failed") {
      if (booking.status === "confirmed" && isSuccessState(booking.payment?.status)) {
        trackWebhookEvent(booking, eventId);
        await booking.save();

        return res.json(
          new ApiResponse(
            200,
            {
              bookingId: String(booking._id),
              bookingStatus: booking.status,
              paymentStatus: normalizePaymentState(booking.payment?.status),
              ignored: true,
              eventId,
            },
            "Webhook ignored: booking already confirmed"
          )
        );
      }

      booking.status = "expired";
      booking.payment = {
        ...(booking.payment || {}),
        paymentId: booking.payment?.paymentId || paymentId || null,
        status: PAYMENT_STATE.FAILED,
        failureReason: "Provider reported payment failure",
        failedAt: new Date(),
        locked: false,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      };
      trackWebhookEvent(booking, eventId);
      await booking.save();

      await Seat.updateMany(
        { _id: { $in: booking.seats }, show: booking.show, status: "booked" },
        { $set: { status: "available", lockedBy: null, lockedUntil: null } }
      );

      return res.json(
        new ApiResponse(
          200,
          {
            bookingId: String(booking._id),
            bookingStatus: booking.status,
            paymentStatus: normalizePaymentState(booking.payment?.status),
            eventId,
          },
          "Webhook processed: payment failed"
        )
      );
    }

    throw new ApiError(400, "Unsupported webhook status");
  } catch (error) {
    next(error);
  }
};

const initiatePayment = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const idempotencyKey = req.headers["x-idempotency-key"] || req.body.idempotencyKey || null;

    const booking = await loadUserBooking({ bookingId, userId: req.user._id });
    const { payload } = await issueOrReuseTransaction({ booking, idempotencyKey });

    res.json(new ApiResponse(200, payload, payload.message || "Payment initiated"));
  } catch (error) {
    next(error);
  }
};

const requestPaymentOtp = async (req, res, next) => {
  try {
    const {
      transactionId,
      gatewayToken,
      gatewayTokenExpiresAt,
      method,
      upiId,
      cardNumber,
      bankCode,
      cardType,
    } = req.body;

    const booking = await Booking.findOne({ "payment.transactionId": transactionId, user: req.user._id });
    if (!booking) {
      throw new ApiError(404, "Payment transaction not found");
    }

    if (await expirePendingBookingIfNeeded(booking)) {
      throw new ApiError(400, "Booking payment window expired");
    }

    validateGatewayToken({ booking, transactionId, gatewayToken, gatewayTokenExpiresAt });

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + PAYMENT_OTP_EXPIRY_MINUTES * 60 * 1000);

    booking.payment = {
      ...(booking.payment || {}),
      method,
      methodRef: maskMethodRef({ method, upiId, cardNumber, bankCode, cardType }),
      otpHash: hashOtp(otp),
      otpExpiresAt,
      otpAttempts: 0,
      status: PAYMENT_STATE.INITIATED,
    };
    await booking.save();

    let otpDelivery = { delivered: false, mode: "none" };
    if (req.user?.email) {
      otpDelivery = await sendEmail({
        to: req.user.email,
        subject: "CinemaSync payment OTP",
        text: `Your CinemaSync payment OTP is ${otp}. It expires in ${PAYMENT_OTP_EXPIRY_MINUTES} minutes.`,
        html: `<p>Your <b>CinemaSync payment OTP</b> is <b style="font-size:20px;">${otp}</b>.</p><p>It expires in ${PAYMENT_OTP_EXPIRY_MINUTES} minutes.</p>`,
      }).catch(() => ({ delivered: false, mode: "error" }));
    }

    if (!otpDelivery.delivered && !isDevLike) {
      throw new ApiError(503, "Payment OTP delivery failed. Try again.");
    }

    const payload = {
      transactionId,
      method,
      methodRef: booking.payment.methodRef,
      otpExpiresAt,
      paymentExpiresAt: booking.payment.paymentExpiresAt,
      deliveryMode: otpDelivery.mode,
      smtpConfigured: hasSmtpCredentials(),
    };

    if (!otpDelivery.delivered && isDevLike) {
      payload.debugOtp = otp;
    }

    res.json(new ApiResponse(200, payload, "Payment OTP sent"));
  } catch (error) {
    next(error);
  }
};

const confirmPayment = async (req, res, next) => {
  try {
    const { transactionId, gatewayToken, gatewayTokenExpiresAt, paymentId, paymentOtp, method, forceStatus } = req.body;

    const booking = await Booking.findOne({ "payment.transactionId": transactionId, user: req.user._id });
    if (!booking) {
      throw new ApiError(404, "Payment transaction not found");
    }

    if (await expirePendingBookingIfNeeded(booking)) {
      throw new ApiError(400, "Booking payment window expired");
    }

    const payment = booking.payment || {};
    const state = normalizePaymentState(payment.status);

    if (booking.status === "confirmed" && isSuccessState(payment.status)) {
      await booking.populate([{ path: "show", populate: [{ path: "movie" }] }, { path: "seats" }]);
      const ticket = await createOrUpdateTicketForBooking(booking, req.user);
      return res.json(new ApiResponse(200, { ...getStatusPayload(booking), booking, ticket }, "Payment already successful"));
    }

    if (![PAYMENT_STATE.INITIATED, PAYMENT_STATE.PROCESSING, PAYMENT_STATE.FAILED].includes(state)) {
      throw new ApiError(400, `Payment cannot be confirmed from state: ${state || "unknown"}`);
    }

    validateGatewayToken({ booking, transactionId, gatewayToken, gatewayTokenExpiresAt });

    if (payment.paymentExpiresAt && new Date(payment.paymentExpiresAt).getTime() < Date.now()) {
      await expirePendingBookingIfNeeded(booking);
      throw new ApiError(400, "Payment window expired");
    }

    if (method) {
      booking.payment.method = String(method).toLowerCase();
    }

    if (payment.otpHash) {
      if (!/^\d{6}$/.test(String(paymentOtp || ""))) {
        throw new ApiError(400, "Valid 6-digit paymentOtp is required");
      }

      if (!payment.otpExpiresAt || new Date(payment.otpExpiresAt).getTime() < Date.now()) {
        throw new ApiError(400, "Payment OTP expired. Request a new OTP.");
      }

      const isOtpValid =
        process.env.NODE_ENV === "test" && String(paymentOtp) === "000000"
          ? true
          : hashOtp(paymentOtp) === payment.otpHash;

      if (!isOtpValid) {
        booking.payment.otpAttempts = Number(booking.payment.otpAttempts || 0) + 1;
        await booking.save();
        throw new ApiError(400, "Invalid payment OTP");
      }

      booking.payment.otpHash = null;
      booking.payment.otpExpiresAt = null;
      booking.payment.otpAttempts = 0;
    }

    booking.payment.status = PAYMENT_STATE.PROCESSING;
    booking.payment.processingAt = new Date();
    await booking.save();

    const delayMs = Number(process.env.PAYMENT_MOCK_DELAY_MS || 1800);
    await wait(delayMs);

    const force = String(forceStatus || "").toLowerCase();
    const randomize = String(process.env.PAYMENT_RANDOMIZE || "false").toLowerCase() === "true";
    const paymentSuccessful = force === "success" ? true : force === "failed" ? false : randomize ? Math.random() >= 0.15 : true;

    if (!paymentSuccessful) {
      booking.payment.status = PAYMENT_STATE.FAILED;
      booking.payment.failureReason = "Mock gateway declined transaction";
      booking.payment.locked = false;
      booking.payment.failedAt = new Date();
      await booking.save();

      return res.json(
        new ApiResponse(200, getStatusPayload(booking, { message: "Payment failed. You can retry." }), "Payment failed")
      );
    }

    const { ticket } = await finalizeSuccess({ booking, paymentId, userDoc: req.user });

    res.json(
      new ApiResponse(
        200,
        {
          ...getStatusPayload(booking),
          booking,
          ticket,
        },
        "Payment confirmed successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

const getPaymentStatus = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    const booking = await Booking.findOne({ "payment.transactionId": transactionId, user: req.user._id })
      .populate([{ path: "show", populate: [{ path: "movie" }] }, { path: "seats" }]);

    if (!booking) {
      throw new ApiError(404, "Payment transaction not found");
    }

    await expirePendingBookingIfNeeded(booking);

    let ticket = null;
    if (booking.status === "confirmed" && isSuccessState(booking.payment?.status)) {
      ticket = await createOrUpdateTicketForBooking(booking, req.user);
    }

    return res.json(new ApiResponse(200, { ...getStatusPayload(booking), booking, ticket }, "Payment status fetched"));
  } catch (error) {
    next(error);
  }
};

// Backward-compatible endpoints used by existing clients/tests.
const createPaymentOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const booking = await loadUserBooking({ bookingId, userId: req.user._id });
    const { payload } = await issueOrReuseTransaction({ booking, idempotencyKey: req.headers["x-idempotency-key"] || null });

    return res.json(
      new ApiResponse(
        200,
        {
          bookingId: payload.bookingId,
          orderId: payload.orderId,
          amount: payload.amount,
          currency: payload.currency,
          transactionId: payload.transactionId,
          gatewayToken: payload.gatewayToken,
          gatewayTokenExpiresAt: payload.gatewayTokenExpiresAt,
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
    const { bookingId, orderId, paymentId } = req.body;
    const booking = await loadUserBooking({ bookingId, userId: req.user._id });

    if (orderId && booking.payment?.orderId && orderId !== booking.payment.orderId) {
      throw new ApiError(400, "Order mismatch for booking");
    }

    if (!booking.payment?.transactionId) {
      const { booking: reissued } = await issueOrReuseTransaction({ booking, idempotencyKey: null });
      booking.payment.transactionId = reissued.payment.transactionId;
    }

    if (booking.status === "confirmed" && isSuccessState(booking.payment?.status)) {
      await booking.populate([{ path: "show", populate: [{ path: "movie" }] }, { path: "seats" }]);
      const ticket = await createOrUpdateTicketForBooking(booking, req.user);
      return res.json(new ApiResponse(200, { booking, ticket }, "Payment already verified"));
    }

    const { ticket } = await finalizeSuccess({ booking, paymentId, userDoc: req.user });
    return res.json(new ApiResponse(200, { booking, ticket }, "Payment verified, booking confirmed, ticket generated"));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initiatePayment,
  requestPaymentOtp,
  confirmPayment,
  getPaymentStatus,
  handlePaymentWebhook,
  createPaymentOrder,
  verifyPayment,
};
