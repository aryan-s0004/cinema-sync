const { before, after, beforeEach, test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test_access_secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test_refresh_secret";
process.env.JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";
process.env.JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";
process.env.PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || "mock";
process.env.SEAT_LOCK_MINUTES = process.env.SEAT_LOCK_MINUTES || "10";

const TEST_MONGO_URI = process.env.MONGO_URI_TEST || "mongodb://127.0.0.1:27017/cinemasync_test";

const app = require("../app");
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

test("POST /api/recommend returns 400 when both mood and genre missing", async () => {
  const response = await request(app).post("/api/recommend").send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("booking flow: lock seats -> booking -> payment -> ticket", async () => {
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

  const orderRes = await request(app)
    .post("/api/payments/create-order")
    .set(authHeader)
    .send({ bookingId });

  assert.equal(orderRes.status, 200);
  assert.equal(orderRes.body.success, true);
  assert.ok(orderRes.body.data.orderId);

  const verifyRes = await request(app)
    .post("/api/payments/verify")
    .set(authHeader)
    .send({
      bookingId,
      orderId: orderRes.body.data.orderId,
      paymentId: "demo_payment_id",
      signature: "demo_signature",
    });

  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.body.success, true);
  assert.equal(verifyRes.body.data.booking.status, "confirmed");
  assert.ok(verifyRes.body.data.ticket.ticketCode);
});
