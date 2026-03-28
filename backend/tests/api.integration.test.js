const { before, after, beforeEach, test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const request = require("supertest");
const mongoose = require("mongoose");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test_access_secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test_refresh_secret";
process.env.JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";
process.env.JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";
process.env.PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || "mock";
process.env.PAYMENT_WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || "test_webhook_secret";
process.env.SEAT_LOCK_MINUTES = process.env.SEAT_LOCK_MINUTES || "10";

const TEST_MONGO_URI = process.env.MONGO_URI_TEST || "mongodb://127.0.0.1:27017/cinemasync_test";

const app = require("../app");
const User = require("../models/User");
const Movie = require("../models/Movie");
const Show = require("../models/Show");
const Seat = require("../models/Seat");

const clearDb = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
};

const registerUserAndGetToken = async () => {
  const email = `test_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;
  const response = await request(app).post("/api/auth/register").send({
    name: "Integration User",
    email,
    password: "password123",
  });

  assert.equal(response.status, 201);
  return response.body.data.accessToken;
};

const registerAdminAndGetToken = async () => {
  const email = `admin_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;
  const response = await request(app).post("/api/auth/register").send({
    name: "Admin User",
    email,
    password: "password123",
  });

  assert.equal(response.status, 201);
  const user = await User.findOne({ email });
  user.role = "admin";
  await user.save();
  return response.body.data.accessToken;
};

before(async () => {
  await mongoose.connect(TEST_MONGO_URI);
});

after(async () => {
  await clearDb();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await clearDb();
});

test("GET /api/health returns success", async () => {
  const response = await request(app).get("/api/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(typeof response.body.data.uptime, "number");
});

test("POST /api/auth/register succeeds with valid payload", async () => {
  const response = await request(app).post("/api/auth/register").send({
    name: "Aryan",
    email: "aryan_test@example.com",
    password: "password123",
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data.accessToken);
  assert.ok(response.body.data.refreshToken);
});

test("POST /api/auth/register returns 400 for invalid payload", async () => {
  const response = await request(app).post("/api/auth/register").send({
    name: "Aryan",
    email: "invalid-email",
    password: "123",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Validation failed");
});

test("POST /api/auth/login requires OTP and verifies successfully", async () => {
  await request(app).post("/api/auth/register").send({
    name: "Otp User",
    email: "otp_user@example.com",
    password: "password123",
  });

  const loginRes = await request(app).post("/api/auth/login").send({
    email: "otp_user@example.com",
    password: "password123",
  });

  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.body.success, true);
  assert.equal(loginRes.body.data.otpRequired, true);

  const user = await User.findOne({ email: "otp_user@example.com" });
  user.otp.hash = crypto.createHash("sha256").update("000000").digest("hex");
  user.otp.purpose = "login";
  user.otp.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  user.otp.attempts = 0;
  await user.save();

  const verifyRes = await request(app).post("/api/auth/login/verify-otp").send({
    email: "otp_user@example.com",
    otp: "000000",
  });

  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.body.success, true);
  assert.ok(verifyRes.body.data.accessToken);
  assert.ok(verifyRes.body.data.refreshToken);
});

test("GET /api/bookings/my returns 401 without token", async () => {
  const response = await request(app).get("/api/bookings/my");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test("GET /api/unknown returns 404", async () => {
  const response = await request(app).get("/api/unknown");

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
});

test("GET /api/test/error returns 500 (server error handling)", async () => {
  const response = await request(app).get("/api/test/error");

  assert.equal(response.status, 500);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Intentional test error");
});

test("POST /api/recommend returns recommendations even when mood and genre missing", async () => {
  const response = await request(app).post("/api/recommend").send({});

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(Array.isArray(response.body.data.recommendations));
});

test("POST /api/seats/suggest returns contiguous seat suggestion", async () => {
  const token = await registerUserAndGetToken();
  const authHeader = { Authorization: `Bearer ${token}` };

  const movie = await Movie.create({
    title: "Suggestion Movie",
    overview: "Suggestion movie",
    language: "en",
    duration: 120,
    rating: 8.2,
    popularity: 10,
    isActive: true,
  });

  const show = await Show.create({
    movie: movie._id,
    theatreName: "CinemaSync Multiplex",
    screenName: "Screen 1",
    showTime: new Date(Date.now() + 60 * 60 * 1000),
    price: 250,
    totalSeats: 10,
    status: "active",
  });

  await Seat.insertMany([
    { show: show._id, row: "A", number: 1, type: "standard", status: "available" },
    { show: show._id, row: "A", number: 2, type: "standard", status: "available" },
    { show: show._id, row: "A", number: 3, type: "premium", status: "available" },
    { show: show._id, row: "A", number: 4, type: "premium", status: "booked" },
  ]);

  const suggestRes = await request(app)
    .post("/api/seats/suggest")
    .set(authHeader)
    .send({ showId: String(show._id), count: 2, preference: "center" });

  assert.equal(suggestRes.status, 200);
  assert.equal(suggestRes.body.success, true);
  assert.equal(suggestRes.body.data.seatIds.length, 2);
  assert.equal(suggestRes.body.data.seatLabels.length, 2);
});

test("booking flow: lock seats -> booking -> initiate -> confirm -> status -> ticket", async () => {
  const token = await registerUserAndGetToken();
  const authHeader = { Authorization: `Bearer ${token}` };

  const movie = await Movie.create({
    title: "Flow Movie",
    overview: "Flow movie",
    language: "en",
    duration: 120,
    rating: 8.2,
    popularity: 10,
    isActive: true,
  });

  const show = await Show.create({
    movie: movie._id,
    theatreName: "CinemaSync Multiplex",
    screenName: "Screen 1",
    showTime: new Date(Date.now() + 60 * 60 * 1000),
    price: 250,
    totalSeats: 10,
    status: "active",
  });

  const seats = await Seat.insertMany([
    { show: show._id, row: "A", number: 1, type: "standard", status: "available" },
    { show: show._id, row: "A", number: 2, type: "standard", status: "available" },
  ]);

  const seatIds = seats.map((seat) => String(seat._id));

  const lockRes = await request(app)
    .post("/api/seats/lock")
    .set(authHeader)
    .send({ showId: String(show._id), seatIds });

  assert.equal(lockRes.status, 200);
  assert.equal(lockRes.body.success, true);
  assert.equal(lockRes.body.data.seats.length, 2);

  const bookingRes = await request(app)
    .post("/api/bookings")
    .set(authHeader)
    .send({ showId: String(show._id), seatIds });

  assert.equal(bookingRes.status, 201);
  assert.equal(bookingRes.body.success, true);
  assert.equal(bookingRes.body.data.status, "pending_payment");

  const bookingId = bookingRes.body.data._id;

  const quoteRes = await request(app).get(`/api/bookings/${bookingId}/quote`).set(authHeader);
  assert.equal(quoteRes.status, 200);
  assert.equal(quoteRes.body.success, true);
  assert.ok(quoteRes.body.data.totalPayable >= quoteRes.body.data.baseAmount);

  const initiateRes = await request(app)
    .post("/api/payments/initiate")
    .set(authHeader)
    .set({ "X-Idempotency-Key": "idem-test-1" })
    .send({ bookingId, idempotencyKey: "idem-test-1" });

  assert.equal(initiateRes.status, 200);
  assert.equal(initiateRes.body.success, true);
  assert.ok(initiateRes.body.data.orderId);
  assert.ok(initiateRes.body.data.transactionId);
  assert.ok(initiateRes.body.data.gatewayToken);
  assert.ok(initiateRes.body.data.gatewayTokenExpiresAt);

  const otpRes = await request(app)
    .post("/api/payments/request-otp")
    .set(authHeader)
    .send({
      transactionId: initiateRes.body.data.transactionId,
      gatewayToken: initiateRes.body.data.gatewayToken,
      gatewayTokenExpiresAt: initiateRes.body.data.gatewayTokenExpiresAt,
      method: "upi",
      upiId: "test@upi",
    });

  assert.equal(otpRes.status, 200);
  assert.equal(otpRes.body.success, true);
  assert.equal(otpRes.body.data.method, "upi");
  assert.ok(otpRes.body.data.otpExpiresAt);

  const confirmRes = await request(app)
    .post("/api/payments/confirm")
    .set(authHeader)
    .send({
      transactionId: initiateRes.body.data.transactionId,
      gatewayToken: initiateRes.body.data.gatewayToken,
      gatewayTokenExpiresAt: initiateRes.body.data.gatewayTokenExpiresAt,
      paymentId: "demo_payment_id",
      paymentOtp: "000000",
      method: "upi",
    });

  assert.equal(confirmRes.status, 200);
  assert.equal(confirmRes.body.success, true);
  assert.equal(confirmRes.body.data.booking.status, "confirmed");
  assert.equal(confirmRes.body.data.paymentStatus, "success");
  assert.ok(confirmRes.body.data.ticket.ticketCode);

  const statusRes = await request(app)
    .get(`/api/payments/status/${initiateRes.body.data.transactionId}`)
    .set(authHeader);

  assert.equal(statusRes.status, 200);
  assert.equal(statusRes.body.success, true);
  assert.equal(statusRes.body.data.paymentStatus, "success");
  assert.equal(statusRes.body.data.booking.status, "confirmed");
});

test("payment confirm is idempotent for same successful transaction", async () => {
  const token = await registerUserAndGetToken();
  const authHeader = { Authorization: `Bearer ${token}` };

  const movie = await Movie.create({
    title: "Idempotent Flow Movie",
    overview: "Idempotent flow movie",
    language: "en",
    duration: 120,
    rating: 8.2,
    popularity: 10,
    isActive: true,
  });

  const show = await Show.create({
    movie: movie._id,
    theatreName: "CinemaSync Multiplex",
    screenName: "Screen 1",
    showTime: new Date(Date.now() + 60 * 60 * 1000),
    price: 250,
    totalSeats: 10,
    status: "active",
  });

  const seats = await Seat.insertMany([
    { show: show._id, row: "B", number: 1, type: "standard", status: "available" },
  ]);

  const seatIds = seats.map((seat) => String(seat._id));

  await request(app)
    .post("/api/seats/lock")
    .set(authHeader)
    .send({ showId: String(show._id), seatIds });

  const bookingRes = await request(app)
    .post("/api/bookings")
    .set(authHeader)
    .send({ showId: String(show._id), seatIds });

  const bookingId = bookingRes.body.data._id;

  const initiateRes = await request(app)
    .post("/api/payments/initiate")
    .set(authHeader)
    .send({ bookingId });

  const payload = {
    transactionId: initiateRes.body.data.transactionId,
    gatewayToken: initiateRes.body.data.gatewayToken,
    gatewayTokenExpiresAt: initiateRes.body.data.gatewayTokenExpiresAt,
    paymentId: "demo_payment_id_2",
  };

  const confirmFirst = await request(app).post("/api/payments/confirm").set(authHeader).send(payload);
  const confirmSecond = await request(app).post("/api/payments/confirm").set(authHeader).send(payload);

  assert.equal(confirmFirst.status, 200);
  assert.equal(confirmSecond.status, 200);
  assert.equal(confirmFirst.body.data.booking._id, confirmSecond.body.data.booking._id);
  assert.equal(confirmSecond.body.data.paymentStatus, "success");
});

test("mock payment webhook confirms booking with valid signature", async () => {
  const token = await registerUserAndGetToken();
  const authHeader = { Authorization: `Bearer ${token}` };

  const movie = await Movie.create({
    title: "Webhook Flow Movie",
    overview: "Webhook flow movie",
    language: "en",
    duration: 120,
    rating: 8.1,
    popularity: 10,
    isActive: true,
  });

  const show = await Show.create({
    movie: movie._id,
    theatreName: "CinemaSync Multiplex",
    screenName: "Screen 4",
    showTime: new Date(Date.now() + 60 * 60 * 1000),
    price: 280,
    totalSeats: 10,
    status: "active",
  });

  const seats = await Seat.insertMany([{ show: show._id, row: "D", number: 1, type: "standard", status: "available" }]);
  const seatIds = seats.map((seat) => String(seat._id));

  await request(app).post("/api/seats/lock").set(authHeader).send({ showId: String(show._id), seatIds });

  const bookingRes = await request(app).post("/api/bookings").set(authHeader).send({ showId: String(show._id), seatIds });
  const bookingId = bookingRes.body.data._id;

  const initiateRes = await request(app).post("/api/payments/initiate").set(authHeader).send({ bookingId });
  const orderId = initiateRes.body.data.orderId;
  const paymentId = `pay_${Date.now()}`;
  const eventId = `evt_${Date.now()}`;

  const invalidWebhookRes = await request(app).post("/api/payments/webhook/mock").send({
    orderId,
    paymentId,
    status: "success",
    signature: "bad_signature",
    eventId,
  });

  assert.equal(invalidWebhookRes.status, 403);

  const signature = crypto
    .createHmac("sha256", process.env.PAYMENT_WEBHOOK_SECRET)
    .update(`${orderId}|${paymentId}|success|${eventId}`)
    .digest("hex");

  const webhookRes = await request(app).post("/api/payments/webhook/mock").send({
    orderId,
    paymentId,
    status: "success",
    signature,
    eventId,
  });

  assert.equal(webhookRes.status, 200);
  assert.equal(webhookRes.body.success, true);
  assert.equal(webhookRes.body.data.bookingStatus, "confirmed");
  assert.ok(webhookRes.body.data.ticketCode);

  const duplicateWebhookRes = await request(app).post("/api/payments/webhook/mock").send({
    orderId,
    paymentId,
    status: "success",
    signature,
    eventId,
  });

  assert.equal(duplicateWebhookRes.status, 200);
  assert.equal(duplicateWebhookRes.body.data.idempotent, true);
  assert.equal(duplicateWebhookRes.body.data.duplicateEvent, true);

  const statusRes = await request(app).get(`/api/payments/status/${initiateRes.body.data.transactionId}`).set(authHeader);
  assert.equal(statusRes.status, 200);
  assert.equal(statusRes.body.data.booking.status, "confirmed");
  assert.equal(statusRes.body.data.paymentStatus, "success");
});

test("admin scan endpoint validates and consumes ticket only once", async () => {
  const userToken = await registerUserAndGetToken();
  const adminToken = await registerAdminAndGetToken();
  const userAuthHeader = { Authorization: `Bearer ${userToken}` };
  const adminAuthHeader = { Authorization: `Bearer ${adminToken}` };

  const movie = await Movie.create({
    title: "Scan Flow Movie",
    overview: "Scan flow movie",
    language: "en",
    duration: 120,
    rating: 8.0,
    popularity: 10,
    isActive: true,
  });

  const show = await Show.create({
    movie: movie._id,
    theatreName: "CinemaSync Multiplex",
    screenName: "Screen 2",
    showTime: new Date(Date.now() + 20 * 60 * 1000),
    price: 300,
    totalSeats: 10,
    status: "active",
  });

  const seats = await Seat.insertMany([{ show: show._id, row: "C", number: 1, type: "standard", status: "available" }]);
  const seatIds = seats.map((seat) => String(seat._id));

  await request(app).post("/api/seats/lock").set(userAuthHeader).send({ showId: String(show._id), seatIds });

  const bookingRes = await request(app).post("/api/bookings").set(userAuthHeader).send({ showId: String(show._id), seatIds });
  const bookingId = bookingRes.body.data._id;

  const initiateRes = await request(app).post("/api/payments/initiate").set(userAuthHeader).send({ bookingId });

  const confirmRes = await request(app).post("/api/payments/confirm").set(userAuthHeader).send({
    transactionId: initiateRes.body.data.transactionId,
    gatewayToken: initiateRes.body.data.gatewayToken,
    gatewayTokenExpiresAt: initiateRes.body.data.gatewayTokenExpiresAt,
    paymentId: "scan_test_payment_id",
  });

  assert.equal(confirmRes.status, 200);
  const qrData = confirmRes.body.data.ticket.qrData;
  assert.ok(qrData);

  const unauthorizedScan = await request(app).post("/api/tickets/scan/validate").set(userAuthHeader).send({ qrData });
  assert.equal(unauthorizedScan.status, 403);

  const dryRunRes = await request(app)
    .post("/api/tickets/scan/validate")
    .set(adminAuthHeader)
    .send({ qrData, consume: false, gate: "Gate A", deviceId: "scanner-01" });

  assert.equal(dryRunRes.status, 200);
  assert.equal(dryRunRes.body.data.valid, true);
  assert.equal(dryRunRes.body.data.consumed, false);

  const consumeRes = await request(app)
    .post("/api/tickets/scan/validate")
    .set(adminAuthHeader)
    .send({ qrData, consume: true, gate: "Gate A", deviceId: "scanner-01" });

  assert.equal(consumeRes.status, 200);
  assert.equal(consumeRes.body.data.valid, true);
  assert.equal(consumeRes.body.data.consumed, true);
  assert.ok(consumeRes.body.data.scannedAt);

  const duplicateScanRes = await request(app)
    .post("/api/tickets/scan/validate")
    .set(adminAuthHeader)
    .send({ qrData, consume: true, gate: "Gate A", deviceId: "scanner-01" });

  assert.equal(duplicateScanRes.status, 409);
  assert.equal(duplicateScanRes.body.success, false);
});
