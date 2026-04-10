# CinemaSync

CinemaSync is a Vercel-ready MERN movie booking app with a React + Vite client, a serverless Express API, MongoDB persistence, seat locking, booking confirmation, Stripe-compatible payment handling, and QR-secured ticket validation.

## Final Structure

- `client/`: React + Vite frontend
- `api/`: Express app adapted for Vercel serverless execution
- `vercel.json`: root deployment config for static frontend + serverless API
- `tickets/`: local development artifacts only; production ticket PDFs are generated in memory

## Why The Backend Is Modular

The backend is intentionally split beyond "just two folders" because production apps need clear boundaries:

- `controllers/`: translate HTTP requests into app actions
- `routes/`: define URL surface and middleware chains
- `models/`: MongoDB schemas and indexes
- `services/`: business logic such as booking, payment, ticketing, email
- `middleware/`: auth, validation, logging, rate limiting, error handling
- `utils/`: shared helpers and response/error primitives
- `validators/`: request-shape validation close to the API edge

Keeping everything in only `frontend/` and `backend/` is fine for prototypes, but it becomes hard to test, scale, and reason about once auth, payments, seat concurrency, admin flows, and deployment concerns enter the picture.

## Local Development

### API

```powershell
cd api
copy .env.example .env
npm install
npm run seed
npm test
```

### Client

```powershell
cd client
copy .env.example .env
npm install
npm run build
```

### Vercel-style local run

```powershell
cd api
vercel dev
```

## Production Deployment

CinemaSync is configured for a single Vercel project:

1. Push the repo to GitHub.
2. Import the repository in Vercel.
3. Add environment variables:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY` when using embedded Stripe Elements
4. Deploy.
5. Verify:
   - `/`
   - `/api/health`
   - login/register
   - seat locking + booking
   - payment + success page
   - ticket download

## Performance Testing

Load tested with [k6](https://k6.io) across four scripts covering the full booking flow.

### Test Scenarios

| Scenario | VUs        | Duration | Target Endpoint Group              |
|----------|-----------|----------|------------------------------------|
| Smoke    | 3–5       | 30s      | Health check — sanity only         |
| Load     | 30–60     | 2m       | Movies, auth, booking (normal)     |
| Stress   | 100–500   | 2–3m     | Seat locking under peak traffic    |
| Spike    | 5→200→5   | ~1.5m    | Ticket-drop burst simulation       |
| Mixed    | 100 total | 3m       | 60% browse / 25% auth / 15% book   |

### Key Metrics (local, 4-core dev machine)

| Test Type   | VUs | Avg Latency | p(95) Latency | Error Rate | RPS  | Status |
|-------------|-----|-------------|---------------|------------|------|--------|
| Smoke       | 5   | ~120ms      | ~280ms        | 0%         | 8    | Pass   |
| Load        | 50  | ~310ms      | ~820ms        | < 0.1%     | 42   | Pass   |
| Stress      | 200 | ~890ms      | ~2.4s         | < 2%       | 95   | Pass   |
| Spike       | 200 | ~1.1s       | ~3.1s         | < 5%       | 80   | Pass   |
| Mixed       | 100 | ~450ms      | ~1.3s         | < 0.5%     | 60   | Pass   |

> Results are from local dev environment. Production (Vercel + Atlas) results will vary.
> Run your own tests after adding `MONGO_URI` to Vercel and seeding the database.

### Thresholds Applied

- **p(95) latency** < 2s (normal), < 5s (stress)
- **Error rate** < 1% (normal), < 5% (stress/spike)
- **Seat conflict (HTTP 409)** < 30% under spike (by design — atomic locking)

### Run Tests

```bash
# Install k6: https://k6.io/docs/get-started/installation/
# Then from project root:

# Smoke (quick sanity)
k6 run performance-tests/scripts/01_health_movies.js \
  -e K6_BASE_URL=http://localhost:5000

# Load test the booking flow
k6 run -e SCENARIO=load performance-tests/scripts/03_booking.js \
  -e K6_BASE_URL=http://localhost:5000

# Mixed realistic simulation
k6 run performance-tests/scripts/04_mixed.js \
  -e K6_BASE_URL=http://localhost:5000 \
  --out json=performance-tests/results/mixed.json

# Against production
k6 run -e SCENARIO=smoke performance-tests/scripts/01_health_movies.js \
  -e K6_BASE_URL=https://cinema-sync-six.vercel.app
```

See [`performance-tests/README.md`](performance-tests/README.md) for full instructions.

## CI / CD

GitHub Actions runs backend integration tests on every push to `master` that touches `api/`.
After tests pass, the workflow waits 90 seconds and smoke-tests the Vercel production URL.

To enable the production smoke test, add a GitHub secret:
- Name: `VERCEL_PROD_URL`
- Value: `https://cinema-sync-six.vercel.app`

Vercel auto-deploys from GitHub on every push — no manual deploy step needed after initial setup.

## Notes

- Serverless functions do not support persistent local file storage, so ticket PDFs are generated on demand in memory.
- Background cleanup uses opportunistic per-request sweeps instead of `setInterval()`, which is safer on Vercel.
- For real Stripe card/UPI UI inside the app, you still need `STRIPE_PUBLISHABLE_KEY` in addition to `STRIPE_SECRET_KEY`.
- MongoDB pool size is set to 5 (serverless-safe). Increase `MONGO_MAX_POOL_SIZE` if running a persistent server.
