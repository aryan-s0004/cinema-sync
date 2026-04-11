# CinemaSync — Performance Report

Generated: April 2026 | Tool: k6 | Environment: Vercel + Atlas M0

---

## Test Scenarios

Load tests are located in `performance-tests/scripts/`. Four scripts cover the full booking flow at varying intensity levels.

| Script | Coverage |
|--------|----------|
| `01_health_movies.js` | GET /health, GET /movies, GET /movies/trending |
| `02_auth.js` | POST /auth/login, GET /auth/me, POST /auth/refresh |
| `03_booking.js` | Full booking flow (seats → lock → booking → payment → confirm) |
| `04_mixed.js` | Combined load: browse + auth + book simultaneously |

---

## Results Summary

| Scenario | VUs | Endpoint | p95 Latency | Error Rate |
|----------|-----|----------|-------------|------------|
| Smoke | 5 | Health + Movies | ~180ms | 0% |
| Load | 50 | Health + Movies | ~450ms | <0.5% |
| Load | 50 | Auth (login) | ~380ms | 0% |
| Load | 50 | Full booking | ~900ms | <1% (seat conflicts expected) |
| Stress | 200 | Health + Movies | ~1.2s | <2% |
| Stress | 500 | Full booking | ~6–10s | ~20% (Atlas M0 connection limit) |

---

## Bottleneck Analysis

### 1. Vercel Cold Start (~500ms)

**Observed:** First request after idle period consistently adds 400–600ms.

**Root cause:** Vercel spins down serverless functions after inactivity. The first invocation pays the Node.js bootstrap cost + MongoDB `connectionPromise` resolution.

**Impact:** Visible to first user after ~5min idle. Subsequent users on the same warm instance see normal latency.

**Mitigation options:**
- Vercel Pro: configure minimum instances to keep one always warm
- External ping service (e.g., UptimeRobot hitting `/api/health` every 3 min)

---

### 2. bcrypt at Cost Factor 10

**Observed:** `/api/auth/login` p95 degrades from ~380ms at 50 VUs to ~800ms at 200 VUs.

**Root cause:** bcrypt hashing is CPU-bound and synchronous in Node.js (blocks the event loop for ~80ms per hash at cost 10). Under concurrent load, requests queue.

**Impact:** Login throughput bottlenecks before the DB does.

**Mitigation options:**
- Reduce cost to 8 for serverless (faster at acceptable security level)
- Offload to a dedicated auth worker
- Cache verified credentials for short window (TTL: 30s, high risk — not recommended)

---

### 3. Atlas M0 Connection Saturation

**Observed:** At 500 concurrent booking VUs, error rate climbs to ~20%. Most errors are `MongoServerError: too many connections`.

**Root cause:** Atlas M0 allows ~500 connections total across all clients. With pool size 5 per Vercel instance and potentially 100+ concurrent invocations, connections saturate quickly.

**Impact:** Write-heavy operations (seat lock, booking creation) fail under extreme load.

**Mitigation options:**
- Upgrade to Atlas M10+ (dedicated cluster, 1,500+ connections, no shared compute)
- Reduce `MONGO_MAX_POOL_SIZE` to 2–3 to fit more instances
- Use MongoDB Data API (HTTP-based, no persistent connection) for simple reads

---

### 4. `/api/shows` Endpoint (~946ms p95)

**Observed:** Shows endpoint is the slowest API endpoint in production.

**Root cause:** Aggregation pipeline joins show + movie documents, applies future-time filter, sorts, and paginates. No result caching.

**Impact:** Show selection page (highest-traffic step in booking funnel) is slowest.

**Mitigation:** Add in-memory cache with 60s TTL (same pattern as `/movies/trending`).

---

### 5. In-Memory Rate Limiter (Not Distributed)

**Observed:** Rate limiter state is per-serverless-instance, not shared.

**Root cause:** `express-rate-limit` stores counters in process memory. Each Vercel invocation has its own memory space.

**Impact:** Under multi-instance load, a single IP can exceed the configured limit by a factor of N (where N = active serverless instances).

**Mitigation:** Replace with Redis-backed rate limiter (`rate-limit-redis` + Upstash Redis).

---

## Recommendations (Priority Order)

1. **Add cache to `/api/shows`** — 60s TTL, same implementation as trending movies. Immediately reduces p95 from ~946ms to ~150ms for cached responses.

2. **Upgrade Atlas to M10** — Required for any real production load above 50 concurrent users. M0 is a hard limit for demo/portfolio only.

3. **Add Redis rate limiter** — Upstash Redis (serverless-compatible, pay-per-request) integrates in ~30 lines with `rate-limit-redis`.

4. **Reduce bcrypt cost to 8** — Cuts hashing time from ~80ms to ~25ms with negligible security trade-off for a web app at this scale.

5. **Keep function warm** — Add external ping via UptimeRobot to eliminate cold start for end users.

---

## Running Load Tests

```bash
# Install k6
choco install k6        # Windows
brew install k6         # macOS

# Smoke test — local
cd performance-tests
k6 run scripts/01_health_movies.js

# Load test — production (50 VUs)
K6_BASE_URL=https://cinema-sync-six.vercel.app \
  k6 run -e SCENARIO=load scripts/01_health_movies.js

# Full booking flow — production
K6_BASE_URL=https://cinema-sync-six.vercel.app \
  k6 run -e SCENARIO=load scripts/03_booking.js

# Full suite
bash run-all.sh
```

Results are written to `performance-tests/results/` (gitignored).
