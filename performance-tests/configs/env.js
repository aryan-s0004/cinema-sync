// Target base URL — override via K6_BASE_URL env var when testing production.
// Local:      K6_BASE_URL=http://localhost:5000  k6 run ...
// Production: K6_BASE_URL=https://cinema-sync-six.vercel.app  k6 run ...

export const BASE_URL = __ENV.K6_BASE_URL || "http://localhost:5000";

// Seeded demo credentials (from api/seed/seedData.js)
export const TEST_USER = {
  email: "aarav.demo@cinemasync.local",
  password: "Pass@12345",
};

export const ADMIN_USER = {
  email: "naina.admin@cinemasync.local",
  password: "Pass@12345",
};

// Replace with real IDs after running the seed and noting the output.
// These are placeholders — the auth + movie scripts fetch real IDs dynamically.
export const SEED_MOVIE_ID = __ENV.K6_MOVIE_ID || "";
export const SEED_SHOW_ID  = __ENV.K6_SHOW_ID  || "";
