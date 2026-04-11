# CinemaSync — Architecture

## System Overview

CinemaSync is a MERN-stack movie booking platform deployed as a serverless monorepo on Vercel. The frontend is a React 19 SPA; the backend is an Express 4 serverless function. Both are served from a single Vercel project using path-based routing.

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

---

## Directory Structure

```
cinema-sync/
├── api/                          ← Express serverless backend
│   ├── index.js                  ← Vercel entry point (exports handler)
│   ├── app.js                    ← Express app setup (middleware, routes)
│   ├── config/
│   │   ├── db.js                 ← MongoDB singleton connection
│   │   └── env.js                ← Env validation + export
│   ├── controllers/              ← Request handlers (thin orchestrators)
│   ├── services/                 ← Business logic layer
│   ├── models/                   ← Mongoose schemas
│   ├── routes/                   ← Express routers
│   ├── middleware/               ← Auth, error, validation middleware
│   ├── validators/               ← Joi schemas
│   ├── utils/                    ← ApiError, ApiResponse, helpers
│   ├── seed/                     ← Database seeder
│   ├── scripts/                  ← Dev utility scripts
│   ├── tests/                    ← Supertest integration tests
│   └── docs/                     ← API-level documentation
│
├── client/                       ← React 19 + Vite frontend
│   ├── src/
│   │   ├── pages/                ← Route-level page components
│   │   ├── components/           ← Reusable UI components
│   │   ├── context/              ← React context (Auth, App)
│   │   ├── hooks/                ← Custom hooks
│   │   ├── services/             ← Axios API wrappers
│   │   └── utils/                ← Formatters, helpers
│   └── public/
│
├── performance-tests/            ← k6 load test scripts
├── docs/                         ← Project-level documentation
├── archive/                      ← Historical reports
├── vercel.json                   ← Vercel routing + build config
└── README.md
```

---

## Key Design Decisions

### 1. Serverless-Safe DB Connection

MongoDB connection is a module-level singleton `connectionPromise`. On cold start, it connects once and caches the live connection. Subsequent warm invocations reuse it. Pool size is capped at 5 to stay within Atlas M0's 500-connection limit across Vercel instances.

```js
// api/config/db.js — simplified
let connectionPromise = null;
export function connectDB() {
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(MONGO_URI, { maxPoolSize: 5, minPoolSize: 1 });
  }
  return connectionPromise;
}
```

### 2. Atomic Seat Locking

Race-condition-safe locking using `Seat.updateMany()` with conditional status filter. Two concurrent requests for the same seat result in exactly one success and one `409 Conflict`. No distributed lock service required.

```js
const result = await Seat.updateMany(
  { _id: { $in: seatIds }, status: "available" },
  { $set: { status: "locked", lockedBy: userId, lockExpiresAt: expiry } }
);
if (result.modifiedCount !== seatIds.length) throw conflict("Seats already taken");
```

### 3. No setInterval (Serverless-Safe Sweep)

Booking expiry cleanup cannot use `setInterval` in serverless — each invocation is ephemeral. Instead, `runMaintenanceSweep()` is called on every non-health request. It uses module-level `lastSweepAt` and a `runningSweep` promise to debounce concurrent sweeps to at most one per 60 seconds.

### 4. Dual Payment Providers

`PAYMENT_PROVIDER` env var routes between `mock` and `stripe`. Mock provider implements a token + OTP gate for development without Stripe keys. Both share the same controller interface; webhooks are verified with HMAC-SHA256 (mock) or `stripe.webhooks.constructEvent` (Stripe).

### 5. JWT-Signed QR Tickets

Ticket QR payload is a JWT signed with `JWT_SECRET`. It includes `nbf` (show time minus 30 minutes) and `exp` (show time plus 30 minutes), so the QR is only valid during the entry window. Scan validation uses `findOneAndUpdate` with `{ scanned: false }` condition — atomic, prevents double-scan.

### 6. MongoDB Text Index with language_override

The `title` text index uses `language_override: "_search_lang"` to prevent MongoDB from reading the `language` field as a text-search language selector. Without this, movies with `language: "hi"` (Hindi) would throw `language override unsupported: hi` during indexing.

---

## Data Model Relationships

```
User ──────────────── Booking (1:N)
                         │
                    BookingIntent (1:1)
                         │
              ┌──────────┴──────────┐
            Show                 Seat (N:N locked)
              │
            Movie
              │
           Ticket (1:1 per Booking)
              │
          ScanLog (1:N per Ticket)
```

---

## Auth Flow

```
Register → OTP email → verify → access token (15m) + refresh token (7d)
Login (password/OTP/Google) → same token pair
Axios interceptor → on 401 → POST /auth/refresh → new token pair (rotation)
Logout → refresh token revoked in DB → 401 on next refresh attempt
```

---

## Booking Flow

```
1. GET /seats/:showId          → seat map with statuses
2. POST /seats/lock            → atomic lock (10min window)
3. POST /bookings              → create booking from locked seats
4. POST /payments/initiate     → get payment token (mock) or PaymentIntent (Stripe)
5. POST /payments/confirm      → verify payment → mark seats booked → issue ticket
```

---

## Frontend Architecture

- **React 19** with functional components and hooks
- **Vite** for build — `client/dist/` is the static output served by Vercel
- **Axios interceptor** in `src/services/api.js` handles token refresh transparently
- **AuthContext** stores user, tokens, and provides `login`/`logout`
- **AppContext** stores global UI state (movies, shows cache)
- **Protected routes** via `ProtectedRoute` and `AdminRoute` wrapper components
- **Framer Motion** for page transitions and component animations
- **Tailwind CSS** dark theme: background `#09090d`, accent red `#E50914`, accent purple `#9333ea`
