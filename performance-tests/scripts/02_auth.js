/**
 * Script 02 — Authentication (Login / Register / Token Refresh)
 * Tests:
 *   POST /api/auth/login
 *   POST /api/auth/register  (unique email per VU to avoid conflicts)
 *   POST /api/auth/refresh
 *   GET  /api/auth/me
 *
 * Scenarios:
 *   smoke  → 5 VUs, 30s
 *   load   → 50 VUs, 2m
 *   stress → 150 VUs, 1m  (auth is typically the hottest path on launch)
 *
 * Run:
 *   k6 run scripts/02_auth.js --out json=results/02_auth.json
 *   k6 run -e SCENARIO=load scripts/02_auth.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { BASE_URL, TEST_USER } from "../configs/env.js";
import { jsonHeaders, parseJson } from "../configs/helpers.js";
import { thresholds, stressThresholds } from "../configs/thresholds.js";

const loginLatency    = new Trend("auth_login_latency",    true);
const registerLatency = new Trend("auth_register_latency", true);
const refreshLatency  = new Trend("auth_refresh_latency",  true);
const authFailRate    = new Rate("auth_failure_rate");

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
      { duration: "30s", target: 50 },
      { duration: "1m",  target: 50 },
      { duration: "30s", target: 0  },
    ],
  },
  stress: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "20s", target: 50  },
      { duration: "20s", target: 150 },
      { duration: "30s", target: 150 },
      { duration: "30s", target: 0   },
    ],
  },
  spike: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "10s", target: 10  },  // baseline
      { duration: "5s",  target: 200 },  // sudden spike
      { duration: "30s", target: 200 },  // hold spike
      { duration: "10s", target: 10  },  // recover
      { duration: "10s", target: 0   },
    ],
  },
};

export const options = {
  scenarios: { [SCENARIO]: scenarios[SCENARIO] },
  thresholds: {
    ...(SCENARIO === "stress" || SCENARIO === "spike" ? stressThresholds : thresholds),
    auth_login_latency:    ["p(95)<2000"],
    auth_register_latency: ["p(95)<3000"],
    auth_failure_rate:     ["rate<0.02"],
  },
};

// Use existing seeded user for login flow.
// VU ID is used to generate unique registration emails to avoid 409 conflicts.
export default function () {
  const vuId  = __VU;
  const iter  = __ITER;
  const ts    = Date.now();

  // ── 1. Login with seeded user ────────────────────────────────────────────
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
    { headers: jsonHeaders }
  );
  loginLatency.add(loginRes.timings.duration);

  const loginBody   = parseJson(loginRes);
  const loginOk     = loginRes.status === 200 && !!loginBody?.data?.accessToken;
  authFailRate.add(!loginOk);

  check(loginRes, {
    "login: status 200":        (r) => r.status === 200,
    "login: has accessToken":   (r) => !!parseJson(r)?.data?.accessToken,
    "login: has refreshToken":  (r) => !!parseJson(r)?.data?.refreshToken,
    "login: under 2s":          (r) => r.timings.duration < 2000,
  });

  sleep(0.5);

  if (!loginOk) {
    sleep(2);
    return; // skip dependent steps if login failed
  }

  const accessToken  = loginBody.data.accessToken;
  const refreshToken = loginBody.data.refreshToken;
  const authHdr = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  // ── 2. Get current user profile (authenticated) ──────────────────────────
  const meRes = http.get(`${BASE_URL}/api/auth/me`, { headers: authHdr });
  check(meRes, {
    "me: status 200":       (r) => r.status === 200,
    "me: has email":        (r) => !!parseJson(r)?.data?.email,
    "me: under 1s":         (r) => r.timings.duration < 1000,
  });

  sleep(1);

  // ── 3. Refresh token ─────────────────────────────────────────────────────
  const refreshRes = http.post(
    `${BASE_URL}/api/auth/refresh`,
    JSON.stringify({ refreshToken }),
    { headers: jsonHeaders }
  );
  refreshLatency.add(refreshRes.timings.duration);
  check(refreshRes, {
    "refresh: status 200":       (r) => r.status === 200,
    "refresh: has accessToken":  (r) => !!parseJson(r)?.data?.accessToken,
    "refresh: under 1.5s":       (r) => r.timings.duration < 1500,
  });

  sleep(1);

  // ── 4. Register a new user (every 10 iterations to avoid DB pollution) ───
  // Only run registration on iteration 0 for each VU to keep the load realistic.
  if (iter === 0) {
    const newEmail = `perf_vu${vuId}_${ts}@loadtest.local`;
    const registerRes = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({
        name: `Load Test VU ${vuId}`,
        email: newEmail,
        password: "LoadTest@123",
      }),
      { headers: jsonHeaders }
    );
    registerLatency.add(registerRes.timings.duration);
    check(registerRes, {
      "register: status 201":     (r) => r.status === 201,
      "register: has token":      (r) => !!parseJson(r)?.data?.accessToken,
      "register: under 3s":       (r) => r.timings.duration < 3000,
    });
  }

  sleep(2);
}
