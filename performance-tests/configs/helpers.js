import http from "k6/http";
import { check } from "k6";
import { BASE_URL, TEST_USER } from "./env.js";

// Standard JSON headers — reuse everywhere to avoid repetition.
export const jsonHeaders = { "Content-Type": "application/json" };

export function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// Login once and return the access token.
// Call this in setup() so it runs once per test, not once per VU iteration.
export function loginAndGetToken(email = TEST_USER.email, password = TEST_USER.password) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: jsonHeaders }
  );

  check(res, {
    "login: status 200": (r) => r.status === 200,
    "login: has accessToken": (r) => {
      try {
        return !!JSON.parse(r.body).data?.accessToken;
      } catch {
        return false;
      }
    },
  });

  try {
    return JSON.parse(res.body).data?.accessToken || "";
  } catch {
    return "";
  }
}

// Safe JSON parse — returns null on failure instead of throwing.
export function parseJson(res) {
  try {
    return JSON.parse(res.body);
  } catch {
    return null;
  }
}

// Pick a random element from an array.
export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Build a realistic-looking seat selection from an availability list.
// Returns up to `count` available seat IDs.
export function pickAvailableSeats(seats, count = 2) {
  if (!Array.isArray(seats)) return [];
  return seats
    .filter((s) => s.status === "available")
    .slice(0, count)
    .map((s) => s._id);
}
