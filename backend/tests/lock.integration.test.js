const { before, after, beforeEach, test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test_access_secret";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret";
process.env.OTP_DEBUG_PREVIEW = "true";
process.env.SEAT_LOCK_MINUTES = "15";

const TEST_MONGO_URI = process.env.MONGO_URI_TEST || "mongodb://127.0.0.1:27017/cinemasync_test_lock";

const app = require("../app");
const User = require("../models/User");
const Movie = require("../models/Movie");
const Show = require("../models/Show");
const Seat = require("../models/Seat");
const Booking = require("../models/Booking");

const clearDb = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
};

const registerUserAndGetToken = async (email = "test@example.com") => {
  const response = await request(app).post("/api/auth/register").send({
    name: "Lock User",
    email,
    password: "password123",
  });
  if (!response.body || !response.body.data) {
    console.error("[ERROR] Registration failed for", email, "Status:", response.status, "Body:", JSON.stringify(response.body));
    throw new Error(`Registration failed: ${response.status}`);
  }

  const otp = response.body.data.emailVerification?.otpPreview;
  if (!otp) {
    throw new Error(`Verification OTP missing for ${email}`);
  }

  const verifyRes = await request(app).post("/api/auth/verify-account-otp").send({ email, otp });
  if (!verifyRes.body?.data?.accessToken) {
    console.error("[ERROR] Verification failed for", email, "Status:", verifyRes.status, "Body:", JSON.stringify(verifyRes.body));
    throw new Error(`Verification failed: ${verifyRes.status}`);
  }

  return verifyRes.body.data.accessToken;
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

test("Seat lock expiration: expired locks should be treatable as available", async () => {
  try {
    const token = await registerUserAndGetToken();
    const authHeader = { Authorization: `Bearer ${token}` };

    const movie = await Movie.create({ title: "Lock Movie", language: "en", duration: 120 });
    const show = await Show.create({
      movie: movie._id,
      theatreName: "Test Theatre",
      screenName: "S1",
      showTime: new Date(Date.now() + 3600000),
      price: 200,
      totalSeats: 10,
    });

    const seat = await Seat.create({
      show: show._id,
      row: "A",
      number: 1,
      status: "locked",
      lockedBy: new mongoose.Types.ObjectId(),
      lockedUntil: new Date(Date.now() - 1000), // Expired 1 second ago
    });

    // Try to lock this seat again
    const lockRes = await request(app)
      .post("/api/seats/lock")
      .set(authHeader)
      .send({ showId: String(show._id), seatIds: [String(seat._id)] });

    if (lockRes.status !== 200) {
      console.error("[TEST FAIL] lockRes.status:", lockRes.status, "Body:", JSON.stringify(lockRes.body));
    }

    assert.equal(lockRes.status, 200, "Should be able to lock an expired seat");
    assert.equal(lockRes.body.success, true);
    
    const updatedSeat = await Seat.findById(seat._id);
    assert.equal(updatedSeat.status, "locked");
    assert.ok(new Date(updatedSeat.lockedUntil) > new Date());
  } catch (err) {
    console.error("[TEST EXCEPTION]", err);
    throw err;
  }
});

test("Double booking prevention: cannot lock already locked seat", async () => {
  try {
    const token1 = await registerUserAndGetToken("user1@example.com");
    const token2 = await registerUserAndGetToken("user2@example.com");

    const movie = await Movie.create({ title: "Conflict Movie", language: "en", duration: 120 });
    const show = await Show.create({
      movie: movie._id,
      theatreName: "Test Theatre",
      screenName: "S1",
      showTime: new Date(Date.now() + 3600000),
      price: 200,
      totalSeats: 10,
    });

    const seat = await Seat.create({
      show: show._id,
      row: "B",
      number: 1,
      status: "available",
    });

    // User 1 locks the seat
    const lockRes1 = await request(app)
      .post("/api/seats/lock")
      .set({ Authorization: `Bearer ${token1}` })
      .send({ showId: String(show._id), seatIds: [String(seat._id)] });

    if (lockRes1.status !== 200) {
      console.error("[ERROR] lockRes1 status:", lockRes1.status, "body:", JSON.stringify(lockRes1.body));
    }
    assert.equal(lockRes1.status, 200);

    // User 2 tries to lock the same seat
    const lockRes2 = await request(app)
      .post("/api/seats/lock")
      .set({ Authorization: `Bearer ${token2}` })
      .send({ showId: String(show._id), seatIds: [String(seat._id)] });

    if (lockRes2.status !== 409) {
      console.error("[ERROR] lockRes2 status:", lockRes2.status, "body:", JSON.stringify(lockRes2.body));
    }
    assert.equal(lockRes2.status, 409, "Should fail with conflict for already locked seat");
  } catch (err) {
    console.error("[ERROR] EXCEPTION DoubleLock", err);
    throw err;
  }
});

test("Atomic booking: cannot book if seat is already booked by another", async () => {
  try {
    const token1 = await registerUserAndGetToken("user1@example.com");
    const token2 = await registerUserAndGetToken("user2@example.com");

    const movie = await Movie.create({ title: "Booking Movie", language: "en", duration: 120 });
    const show = await Show.create({
      movie: movie._id,
      theatreName: "Test Theatre",
      screenName: "S1",
      showTime: new Date(Date.now() + 3600000),
      price: 200,
      totalSeats: 10,
    });

    const seat = await Seat.create({
      show: show._id,
      row: "C",
      number: 1,
      status: "available",
    });

    // User 1 locks and books
    const lockRes1 = await request(app)
      .post("/api/seats/lock")
      .set({ Authorization: `Bearer ${token1}` })
      .send({ showId: String(show._id), seatIds: [String(seat._id)] });
    
    if (lockRes1.status !== 200) {
      console.error("[ERROR] lockRes1 (Atomic) status:", lockRes1.status, "body:", JSON.stringify(lockRes1.body));
    }
    assert.equal(lockRes1.status, 200);

    const bookingRes1 = await request(app)
      .post("/api/bookings")
      .set({ Authorization: `Bearer ${token1}` })
      .send({ showId: String(show._id), seatIds: [String(seat._id)] });
    
    if (bookingRes1.status !== 201) {
      console.error("[ERROR] bookingRes1 status:", bookingRes1.status, "body:", JSON.stringify(bookingRes1.body));
    }
    assert.equal(bookingRes1.status, 201);

    // User 2 tries to book the same seat (without lock)
    const bookingRes2 = await request(app)
      .post("/api/bookings")
      .set({ Authorization: `Bearer ${token2}` })
      .send({ showId: String(show._id), seatIds: [String(seat._id)] });

    if (bookingRes2.status !== 409) {
      console.error("[ERROR] bookingRes2 status:", bookingRes2.status, "body:", JSON.stringify(bookingRes2.body));
    }
    assert.equal(bookingRes2.status, 409, "Should fail booking if seat is no longer available/locked by others");
  } catch (err) {
    console.error("[ERROR] EXCEPTION AtomicBooking", err);
    throw err;
  }
});
