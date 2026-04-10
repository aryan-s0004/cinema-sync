/**
 * Script 01 — Health + Movie Listing (READ-ONLY)
 * Tests the most common unauthenticated paths:
 *   GET /api/health
 *   GET /api/movies
 *   GET /api/movies/:id
 *
 * Scenarios:
 *   smoke  → 5 VUs, 30s  (verify nothing is broken)
 *   load   → 50 VUs, 2m  (normal traffic)
 *   stress → 200 VUs, 1m (peak traffic)
 *
 * Run:
 *   k6 run scripts/01_health_movies.js --out json=results/01_health_movies.json
 *   k6 run -e SCENARIO=load scripts/01_health_movies.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";
import { BASE_URL } from "../configs/env.js";
import { jsonHeaders, parseJson, randomItem } from "../configs/helpers.js";
import { thresholds, stressThresholds } from "../configs/thresholds.js";

// Custom metrics for fine-grained analysis
const movieListLatency  = new Trend("movie_list_latency",  true);
const movieDetailLatency = new Trend("movie_detail_latency", true);
const healthLatency      = new Trend("health_latency",       true);
const notFoundCounter    = new Counter("not_found_errors");

const SCENARIO = __ENV.SCENARIO || "smoke";

const scenarios = {
  smoke: {
    executor: "constant-vus",
    vus: 5,
    duration: "30s",
  },
  load: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "30s", target: 50 },   // ramp up
      { duration: "1m",  target: 50 },   // hold
      { duration: "30s", target: 0  },   // ramp down
    ],
  },
  stress: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "20s", target: 100  },
      { duration: "20s", target: 200  },
      { duration: "20s", target: 500  },
      { duration: "30s", target: 500  },
      { duration: "30s", target: 0   },
    ],
  },
};

export const options = {
  scenarios: { [SCENARIO]: scenarios[SCENARIO] },
  thresholds: SCENARIO === "stress" ? stressThresholds : thresholds,
};

// Fetch a small set of movie IDs during setup (runs once, not per VU).
export function setup() {
  const res = http.get(`${BASE_URL}/api/movies?limit=10`, { headers: jsonHeaders });
  const body = parseJson(res);
  const movies = body?.data?.movies || body?.data || [];
  return { movieIds: movies.slice(0, 5).map((m) => m._id).filter(Boolean) };
}

export default function (data) {
  // ── 1. Health check ─────────────────────────────────────────────────────
  const healthRes = http.get(`${BASE_URL}/api/health`);
  healthLatency.add(healthRes.timings.duration);
  check(healthRes, {
    "health: status 200":     (r) => r.status === 200,
    "health: success true":   (r) => parseJson(r)?.success === true,
    "health: under 500ms":    (r) => r.timings.duration < 500,
  });

  sleep(0.5);

  // ── 2. Movie listing ─────────────────────────────────────────────────────
  const page = Math.floor(Math.random() * 3) + 1;
  const listRes = http.get(
    `${BASE_URL}/api/movies?page=${page}&limit=12`,
    { headers: jsonHeaders }
  );
  movieListLatency.add(listRes.timings.duration);
  check(listRes, {
    "movie list: status 200":      (r) => r.status === 200,
    "movie list: has data":        (r) => !!parseJson(r)?.data,
    "movie list: under 1s":        (r) => r.timings.duration < 1000,
  });

  sleep(1);

  // ── 3. Movie detail (random from setup pool) ─────────────────────────────
  if (data.movieIds.length > 0) {
    const movieId = randomItem(data.movieIds);
    const detailRes = http.get(
      `${BASE_URL}/api/movies/${movieId}`,
      { headers: jsonHeaders }
    );
    movieDetailLatency.add(detailRes.timings.duration);

    if (detailRes.status === 404) notFoundCounter.add(1);

    check(detailRes, {
      "movie detail: status 200":   (r) => r.status === 200,
      "movie detail: has _id":      (r) => !!parseJson(r)?.data?._id,
      "movie detail: under 1.5s":   (r) => r.timings.duration < 1500,
    });
  }

  sleep(2); // simulate user reading the page
}
