/**
 * Script 04 — Mixed Realistic User Simulation
 * Simulates a realistic mix of concurrent user behaviours:
 *   - 60% browsing (anonymous)    → movies, shows
 *   - 25% authenticated browsing  → dashboard, recommendations
 *   - 15% booking                 → seat lock + create booking
 *
 * Uses k6 scenarios with weighted executor split.
 * This is the closest to real production traffic.
 *
 * Run:
 *   k6 run scripts/04_mixed.js --out json=results/04_mixed.json
 *
 * The SCENARIO env var is ignored here — all 3 groups run simultaneously.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { BASE_URL, TEST_USER } from "../configs/env.js";
import {
  jsonHeaders,
  authHeaders,
  parseJson,
  randomItem,
  loginAndGetToken,
  pickAvailableSeats,
} from "../configs/helpers.js";

// ── Custom metrics ────────────────────────────────────────────────────────────
const browseDuration  = new Trend("browse_req_duration",  true);
const bookingDuration = new Trend("booking_req_duration", true);
const errorRate       = new Rate("mixed_error_rate");

// ── Scenarios ─────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // 60% anonymous browsing — highest VU count
    anonymous_browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 30 },
        { duration: "2m",  target: 60 },
        { duration: "30s", target: 0  },
      ],
      exec: "browseAnonymous",
      gracefulStop: "10s",
    },

    // 25% authenticated browsing
    auth_browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 12 },
        { duration: "2m",  target: 25 },
        { duration: "30s", target: 0  },
      ],
      exec: "browseAuthenticated",
      gracefulStop: "10s",
    },

    // 15% booking attempts
    booking_flow: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 5  },
        { duration: "2m",  target: 15 },
        { duration: "30s", target: 0  },
      ],
      exec: "attemptBooking",
      gracefulStop: "30s",
    },
  },

  thresholds: {
    // Global
    http_req_duration:    ["p(95)<3000"],
    http_req_failed:      ["rate<0.02"],
    // Per-group
    browse_req_duration:  ["p(95)<1500"],
    booking_req_duration: ["p(95)<5000"],
    mixed_error_rate:     ["rate<0.02"],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: fetch a random movie and its shows
// ─────────────────────────────────────────────────────────────────────────────
function getRandomShow() {
  const listRes = http.get(
    `${BASE_URL}/api/movies?limit=8`,
    { headers: jsonHeaders }
  );
  const movies = parseJson(listRes)?.data?.movies || parseJson(listRes)?.data || [];
  if (!movies.length) return null;

  const movie = randomItem(movies);
  const showsRes = http.get(
    `${BASE_URL}/api/shows?movieId=${movie._id}`,
    { headers: jsonHeaders }
  );
  const shows = parseJson(showsRes)?.data?.shows || parseJson(showsRes)?.data || [];
  if (!shows.length) return null;

  return { movie, show: randomItem(shows) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario A: Anonymous browsing (60%)
// ─────────────────────────────────────────────────────────────────────────────
export function browseAnonymous() {
  // Health ping
  const h = http.get(`${BASE_URL}/api/health`);
  browseDuration.add(h.timings.duration);
  errorRate.add(h.status !== 200);
  sleep(0.3);

  // Movie listing
  const listRes = http.get(`${BASE_URL}/api/movies?page=1&limit=12`, { headers: jsonHeaders });
  browseDuration.add(listRes.timings.duration);
  errorRate.add(listRes.status !== 200);
  check(listRes, {
    "anon browse: movies 200": (r) => r.status === 200,
    "anon browse: under 1.5s": (r) => r.timings.duration < 1500,
  });
  sleep(1.5);

  // Movie detail
  const movies = parseJson(listRes)?.data?.movies || parseJson(listRes)?.data || [];
  if (movies.length > 0) {
    const m = randomItem(movies);
    const detailRes = http.get(`${BASE_URL}/api/movies/${m._id}`, { headers: jsonHeaders });
    browseDuration.add(detailRes.timings.duration);
    check(detailRes, {
      "anon browse: detail 200": (r) => r.status === 200,
    });
    sleep(2);
  }

  sleep(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario B: Authenticated browsing (25%)
// ─────────────────────────────────────────────────────────────────────────────
export function browseAuthenticated() {
  // Login (once per iteration — in real tests use setup() shared token)
  const token = loginAndGetToken();
  if (!token) { sleep(3); return; }
  const hdrs = authHeaders(token);

  // My bookings
  const dashRes = http.get(`${BASE_URL}/api/bookings/my`, { headers: hdrs });
  browseDuration.add(dashRes.timings.duration);
  check(dashRes, {
    "auth browse: bookings 200": (r) => r.status === 200,
    "auth browse: under 2s":     (r) => r.timings.duration < 2000,
  });
  sleep(1.5);

  // Recommendations
  const recRes = http.get(`${BASE_URL}/api/recommend`, { headers: hdrs });
  browseDuration.add(recRes.timings.duration);
  check(recRes, {
    "auth browse: recommend 200": (r) => r.status === 200,
  });
  sleep(2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario C: Booking attempt (15%)
// ─────────────────────────────────────────────────────────────────────────────
export function attemptBooking() {
  const token = loginAndGetToken();
  if (!token) { sleep(5); return; }
  const hdrs = authHeaders(token);

  const pick = getRandomShow();
  if (!pick) { sleep(5); return; }

  const { show } = pick;
  sleep(1);

  // Load seat map
  const seatsRes = http.get(`${BASE_URL}/api/seats/${show._id}`, { headers: hdrs });
  bookingDuration.add(seatsRes.timings.duration);
  check(seatsRes, {
    "booking flow: seats 200": (r) => r.status === 200,
  });

  const seats   = parseJson(seatsRes)?.data || [];
  const seatIds = pickAvailableSeats(seats, 2);
  sleep(2); // user picks seats

  if (seatIds.length === 0) { sleep(3); return; }

  // Lock
  const lockRes = http.post(
    `${BASE_URL}/api/seats/lock`,
    JSON.stringify({ showId: show._id, seatIds }),
    { headers: hdrs }
  );
  bookingDuration.add(lockRes.timings.duration);
  errorRate.add(lockRes.status !== 200 && lockRes.status !== 409);
  check(lockRes, {
    "booking flow: lock ok":      (r) => r.status === 200 || r.status === 409,
    "booking flow: lock under 2s":(r) => r.timings.duration < 2000,
  });

  if (lockRes.status !== 200) { sleep(3); return; }
  sleep(1);

  // Create booking
  const bookRes = http.post(
    `${BASE_URL}/api/bookings`,
    JSON.stringify({ showId: show._id, seatIds }),
    { headers: hdrs }
  );
  bookingDuration.add(bookRes.timings.duration);
  errorRate.add(bookRes.status !== 201);
  check(bookRes, {
    "booking flow: created 201": (r) => r.status === 201,
    "booking flow: under 3s":    (r) => r.timings.duration < 3000,
  });

  const bookingId = parseJson(bookRes)?.data?._id;
  sleep(1);

  // Initiate payment
  if (bookingId) {
    const payRes = http.post(
      `${BASE_URL}/api/payments/initiate`,
      JSON.stringify({ bookingId }),
      { headers: hdrs }
    );
    bookingDuration.add(payRes.timings.duration);
    check(payRes, {
      "booking flow: payment 200": (r) => r.status === 200,
    });
  }

  sleep(3);
}
