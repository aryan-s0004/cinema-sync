/**
 * Script 03 — Booking + Seat Locking Flow
 * Tests the complete transactional path:
 *   GET  /api/movies              (pick a movie)
 *   GET  /api/shows?movieId=...   (pick a show)
 *   GET  /api/seats/:showId       (load seat map)
 *   POST /api/seats/lock          (lock seats)
 *   POST /api/bookings            (create booking)
 *   POST /api/payments/initiate   (initiate payment)
 *
 * This is the most critical path — concurrent seat locks stress the
 * MongoDB atomic write and the seat expiry sweep.
 *
 * IMPORTANT: Requires seeded DB. Run `npm run seed` in api/ first.
 *
 * Run:
 *   k6 run scripts/03_booking.js --out json=results/03_booking.json
 *   k6 run -e SCENARIO=load scripts/03_booking.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { BASE_URL, TEST_USER } from "../configs/env.js";
import {
  jsonHeaders,
  authHeaders,
  parseJson,
  randomItem,
  loginAndGetToken,
  pickAvailableSeats,
} from "../configs/helpers.js";
import { thresholds, criticalThresholds } from "../configs/thresholds.js";

// Custom metrics
const seatLockLatency      = new Trend("seat_lock_latency",      true);
const bookingCreateLatency = new Trend("booking_create_latency", true);
const paymentInitLatency   = new Trend("payment_init_latency",   true);
const seatConflictRate     = new Rate("seat_conflict_rate");
const bookingSuccessCount  = new Counter("bookings_created");

const SCENARIO = __ENV.SCENARIO || "smoke";

const scenarios = {
  smoke: {
    executor: "constant-vus",
    vus: 3,
    duration: "30s",
  },
  load: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "30s", target: 30 },
      { duration: "1m",  target: 30 },
      { duration: "30s", target: 0  },
    ],
  },
  stress: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "30s", target: 50  },
      { duration: "30s", target: 100 },
      { duration: "1m",  target: 100 },
      { duration: "30s", target: 0   },
    ],
  },
  // Spike test: simulates a popular show going on sale suddenly
  spike: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "5s",  target: 5   },  // quiet
      { duration: "5s",  target: 150 },  // ticket drop spike
      { duration: "30s", target: 150 },  // everyone trying to book
      { duration: "10s", target: 5   },  // settle
      { duration: "10s", target: 0   },
    ],
  },
};

export const options = {
  scenarios: { [SCENARIO]: scenarios[SCENARIO] },
  thresholds: {
    ...(SCENARIO === "smoke" || SCENARIO === "load"
      ? criticalThresholds
      : {
          http_req_failed: ["rate<0.15"],   // stress: up to 15% conflicts OK
          http_req_duration: ["p(95)<6000"],
          checks: ["rate>0.85"],
        }),
    seat_lock_latency:      ["p(95)<2000"],
    booking_create_latency: ["p(95)<3000"],
    payment_init_latency:   ["p(95)<4000"],
    seat_conflict_rate:     ["rate<0.3"],   // <30% seat conflicts acceptable
  },
};

// setup() runs once before all VUs start.
// Logs in and fetches a valid showId so VUs don't waste time on auth.
export function setup() {
  const token = loginAndGetToken();

  // Fetch movies
  const moviesRes = http.get(`${BASE_URL}/api/movies?limit=5`, { headers: jsonHeaders });
  const movies = parseJson(moviesRes)?.data?.movies || parseJson(moviesRes)?.data || [];

  const showIds = [];
  for (const movie of movies.slice(0, 3)) {
    const showsRes = http.get(
      `${BASE_URL}/api/shows?movieId=${movie._id}`,
      { headers: jsonHeaders }
    );
    const shows = parseJson(showsRes)?.data?.shows || parseJson(showsRes)?.data || [];
    for (const s of shows.slice(0, 2)) {
      if (s._id) showIds.push(s._id);
    }
  }

  return { token, showIds };
}

export default function (data) {
  const { token, showIds } = data;

  if (!token || showIds.length === 0) {
    sleep(2);
    return;
  }

  const headers = authHeaders(token);

  // ── 1. Pick a show and load its seat map ─────────────────────────────────
  const showId = randomItem(showIds);
  const seatsRes = http.get(`${BASE_URL}/api/seats/${showId}`, { headers });
  check(seatsRes, {
    "seats: status 200":      (r) => r.status === 200,
    "seats: has array":       (r) => Array.isArray(parseJson(r)?.data),
    "seats: under 1.5s":      (r) => r.timings.duration < 1500,
  });

  const seats = parseJson(seatsRes)?.data || [];
  const seatIds = pickAvailableSeats(seats, 2);

  sleep(1.5); // user looks at seat map

  if (seatIds.length < 1) {
    // No available seats on this show — skip (common under stress)
    sleep(2);
    return;
  }

  // ── 2. Lock selected seats ────────────────────────────────────────────────
  const lockRes = http.post(
    `${BASE_URL}/api/seats/lock`,
    JSON.stringify({ showId, seatIds }),
    { headers }
  );
  seatLockLatency.add(lockRes.timings.duration);

  const lockConflict = lockRes.status === 409;
  seatConflictRate.add(lockConflict);

  check(lockRes, {
    "lock: status 200 or 409":  (r) => r.status === 200 || r.status === 409,
    "lock: under 2s":           (r) => r.timings.duration < 2000,
  });

  if (lockConflict || lockRes.status !== 200) {
    sleep(2);
    return; // seats taken — realistic abort
  }

  sleep(0.5);

  // ── 3. Create booking ─────────────────────────────────────────────────────
  const bookingRes = http.post(
    `${BASE_URL}/api/bookings`,
    JSON.stringify({ showId, seatIds }),
    { headers }
  );
  bookingCreateLatency.add(bookingRes.timings.duration);

  const bookingBody = parseJson(bookingRes);
  const bookingOk   = bookingRes.status === 201;

  if (bookingOk) bookingSuccessCount.add(1);

  check(bookingRes, {
    "booking: status 201":       (r) => r.status === 201,
    "booking: has _id":          (r) => !!parseJson(r)?.data?._id,
    "booking: pending_payment":  (r) => parseJson(r)?.data?.status === "pending_payment",
    "booking: under 3s":         (r) => r.timings.duration < 3000,
  });

  sleep(0.5);

  // ── 4. Initiate payment ───────────────────────────────────────────────────
  if (bookingOk && bookingBody?.data?._id) {
    const bookingId = bookingBody.data._id;
    const payRes = http.post(
      `${BASE_URL}/api/payments/initiate`,
      JSON.stringify({ bookingId }),
      { headers }
    );
    paymentInitLatency.add(payRes.timings.duration);
    check(payRes, {
      "payment: status 200":       (r) => r.status === 200,
      "payment: has provider":     (r) => !!parseJson(r)?.data?.provider,
      "payment: under 4s":         (r) => r.timings.duration < 4000,
    });
  }

  sleep(3); // simulate user reviewing payment page
}
