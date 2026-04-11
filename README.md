# CinemaSync

> A production-grade MERN movie booking platform — atomic seat locking, dual payment providers, JWT-signed QR tickets, and full serverless deployment on Vercel.

**Live Demo:** https://cinema-sync-six.vercel.app

---

## Project Overview

CinemaSync is a full-stack movie booking system built to production-level standards. Users can browse movies, pick show times, select and lock seats in real time, pay via mock or Stripe, and receive a downloadable PDF ticket with a scannable, cryptographically-signed QR code.

The backend is a serverless Express API deployed on Vercel. The frontend is a React 19 + Vite SPA. Both are served from a single Vercel project using monorepo routing.

---

## Features

### Auth
- Email + password registration with OTP email verification
- OTP login (email and SMS channels)
- Google OAuth (one-click sign-in/sign-up via Google Identity Services)
- Forgot password — 3-step: request code → verify → reset
- JWT access token (15m) + refresh token (7d) with rotation
- Refresh token revocation on logout

### Booking Engine
- Real-time seat map with status (available / locked / booked)
- Atomic seat locking — race-condition-safe via MongoDB `updateMany`
- 10-minute seat lock + 10-minute payment window
- Booking quote: base price + 3% convenience fee + 18% GST
- Multi-step booking wizard with resume-on-refresh (BookingIntent)
- Booking cancellation with automatic seat release

### Payment
- **Mock provider** — full token + OTP flow for testing without Stripe keys
- **Stripe** — PaymentIntent with SCA support, customer de-duplication
- Webhook verification (HMAC-SHA256 for mock, `stripe.webhooks.constructEvent` for Stripe)
- Idempotency key support to prevent double-charges

### Ticket System
- Auto-generated ticket on payment confirmation
- JWT-signed QR code (time-windowed to show entry period)
- PDF ticket download (in-memory via PDFKit — no filesystem writes)
- QR scan validation: atomic consume, duplicate-scan detection, scan audit log

### Movies & Shows
- Dual movie provider: seeded database or live TMDB API
- AI-powered recommendations (OpenAI genre inference + booking history analysis)
- Movie search with regex, pagination, admin CRUD
- Auto-provisioning of 4 show time slots per movie when none exist

### Frontend
- React 19 + Vite + Tailwind CSS dark theme
- Framer Motion animations throughout
- Skeleton loading cards while data fetches
- Auto token refresh via Axios interceptor
- Admin panel: manage movies and shows
- Responsive for mobile and desktop

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express 4, Mongoose |
| Database | MongoDB Atlas |
| Auth | JWT (access + refresh), Google OAuth, bcrypt |
| Payment | Stripe PaymentIntents, Mock provider |
| Ticket | PDFKit, QRCode, JWT-signed QR |
| Deployment | Vercel (monorepo: api/ + client/) |
| CI/CD | GitHub Actions (integration tests + post-deploy smoke test) |
| Load Testing | k6 (smoke / load / stress / spike scenarios) |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│              React 19 SPA (Vite build)               │
│   Pages → Hooks → Axios API Layer → Context          │
└─────────────────────────┬────────────────────────────┘
                          │ /api/* (same-origin)
                          ▼
┌──────────────────────────────────────────────────────┐
│            Vercel Serverless Function                │
│   helmet → cors → rate limiter → JWT auth → routes  │
│                                                      │
│   /auth  /movies  /shows  /seats                    │
│   /bookings  /payments  /tickets  /recommend         │
└──────┬────────────────────────┬───────────────────┬──┘
       ▼                        ▼                   ▼
  MongoDB Atlas            Stripe API         Google OAuth
  (CinemaSync_DB)       (PaymentIntents)   (ID Token verify)
```

**Key design decisions:**

- **Serverless-safe DB connection**: Singleton `connectionPromise` reused across warm invocations. Pool size capped at 5 to respect Atlas M0 connection limits.
- **Atomic seat locking**: `Seat.updateMany()` with status conditions — two concurrent requests for the same seat will result in exactly one success and one `409 Conflict`.
- **No `setInterval`**: Booking expiry uses a throttled `runMaintenanceSweep()` called on every request, deduplicating concurrent sweeps via a module-level promise reference.

---

## API Highlights

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register with email |
| POST | `/api/auth/login` | — | Password or OTP login |
| POST | `/api/auth/google` | — | Google OAuth |
| POST | `/api/auth/refresh` | — | Rotate JWT pair |
| GET | `/api/movies` | — | List movies (paginated) |
| GET | `/api/movies/trending` | — | Trending (cached) |
| POST | `/api/recommend` | optional | AI + history recommendations |
| GET | `/api/shows` | — | Upcoming shows by movie |
| GET | `/api/seats/:showId` | — | Seat map for a show |
| POST | `/api/seats/lock` | user | Atomic seat lock (10min) |
| POST | `/api/bookings` | user | Create booking from locked seats |
| POST | `/api/payments/initiate` | user | Start mock or Stripe payment |
| POST | `/api/payments/confirm` | user | Confirm payment + issue ticket |
| GET | `/api/tickets/my` | user | User's tickets |
| GET | `/api/tickets/:code/download` | user | PDF ticket download |
| POST | `/api/tickets/scan` | admin | QR scan validation |

---

## Performance Insights (k6)

Load tests are in `performance-tests/scripts/`. Run against local or production:

```bash
# Install k6
choco install k6          # Windows
brew install k6           # macOS

# Smoke test (5 VUs, 30s)
cd performance-tests
k6 run scripts/01_health_movies.js

# Load test (50 VUs) against production
K6_BASE_URL=https://cinema-sync-six.vercel.app k6 run -e SCENARIO=load scripts/01_health_movies.js

# Full suite
bash run-all.sh
```

| Scenario | VUs | Endpoint | p95 Latency | Error Rate |
|---|---|---|---|---|
| Smoke | 5 | Health + Movies | ~180ms | 0% |
| Load | 50 | Health + Movies | ~450ms | <0.5% |
| Load | 50 | Auth (login) | ~380ms | 0% |
| Load | 50 | Full booking | ~900ms | <1% (seat conflicts) |
| Stress | 200 | Health + Movies | ~1.2s | <2% |
| Stress | 500 | Full booking | ~6–10s | ~20% (Atlas M0 limit) |

**Bottlenecks identified:**
- Vercel cold start adds ~500ms on first request after idle
- bcrypt at cost 10 degrades under 500 concurrent logins (sequential hashing)
- Atlas M0 write contention beyond 200 concurrent booking writes

---

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB running locally or Atlas connection string

### Backend
```bash
cd api
cp .env.example .env          # fill in MONGO_URI and other vars
npm install
node index.js                 # or nodemon for hot reload
```

### Frontend
```bash
cd client
cp .env.example .env          # set VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
```

### Seed Database
```bash
cd api
MONGO_URI=<your-uri> node seed/seedData.js
# Seeds 12 movies, 24 shows, 4 sample bookings
# Demo password: Pass@12345
```

---

## Deployment (Vercel)

The project uses a monorepo layout:

```
cinema-sync/
├── api/            ← Express serverless backend
│   └── index.js   ← Vercel entry point (exports handler)
├── client/         ← React + Vite frontend
│   └── package.json
└── vercel.json     ← Build + routing config
```

```json
{
  "builds": [
    { "src": "client/package.json", "use": "@vercel/static-build" },
    { "src": "api/index.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.js" },
    { "src": "/(.*)", "dest": "/client/index.html" }
  ]
}
```

**Required Vercel environment variables:**

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Signing secret (covers access + refresh + QR) |
| `NODE_ENV` | `production` |
| `PAYMENT_PROVIDER` | `mock` or `stripe` |
| `MOVIE_PROVIDER` | `database` or `tmdb` |
| `CLIENT_URL` | Production frontend URL |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (backend) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID (frontend build) |
| `VITE_API_URL` | `/api` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

---

## CI/CD

On every push to `master`:

1. **Integration tests** — supertest suite hits local Express app + test MongoDB
2. **Vercel auto-deploy** — triggered by GitHub integration
3. **Post-deploy smoke test** — GitHub Actions waits 90s then curls `/api/health` and `/api/movies` on production

Add `VERCEL_PROD_URL` to GitHub repo secrets to enable the smoke test.

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| User | aarav.demo@cinemasync.local | Pass@12345 |
| Admin | naina.admin@cinemasync.local | Pass@12345 |

---

## Future Improvements

- [ ] Refund flow via Stripe Refunds API
- [ ] Email ticket delivery (PDF attachment on booking confirmation)
- [ ] Redis-backed distributed rate limiter and session cache
- [ ] Playwright E2E test suite covering full booking flow
- [ ] Analytics dashboard (revenue, occupancy, cancellation rate)
- [ ] Push notifications for booking reminders
- [ ] Multi-theatre and multi-city support
- [ ] Upgrade Atlas to M10 for production write throughput

---

## Project Report

See [report_progress.txt](report_progress.txt) for detailed feature completion percentages, strength/weakness analysis, and deployment readiness status.
