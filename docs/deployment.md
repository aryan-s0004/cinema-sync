# CinemaSync — Deployment Guide

## Live URL

**Production:** https://cinema-sync-six.vercel.app

---

## Vercel Monorepo Layout

```
cinema-sync/
├── api/            ← Express serverless backend (@vercel/node)
│   └── index.js   ← Exports handler (no app.listen)
├── client/         ← React + Vite SPA (@vercel/static-build)
│   └── package.json
└── vercel.json     ← Build + routing config
```

`vercel.json`:
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

**CRITICAL:** Do not rename `api/` — `vercel.json` references `api/index.js` directly.

---

## Required Environment Variables

Set all 15 variables in Vercel dashboard (Project → Settings → Environment Variables) or via CLI:

| Variable | Value |
|----------|-------|
| `MONGO_URI` | `mongodb+srv://aryan:aryan@cluster0.e5kuyrr.mongodb.net/CinemaSync_DB?retryWrites=true&w=majority` |
| `JWT_SECRET` | Long random string (32+ chars) |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | `https://cinema-sync-six.vercel.app` |
| `PAYMENT_PROVIDER` | `mock` or `stripe` |
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | From Stripe dashboard webhook settings |
| `MOCK_WEBHOOK_SECRET` | Any secret string |
| `MOVIE_PROVIDER` | `database` or `tmdb` |
| `TMDB_API_KEY` | From themoviedb.org (optional if using database) |
| `GOOGLE_CLIENT_ID` | `510088075115-2ir6th054c222ar5pfvj7gtdoaca200d.apps.googleusercontent.com` |
| `VITE_GOOGLE_CLIENT_ID` | Same as above (frontend build-time) |
| `VITE_API_URL` | `/api` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Same as `STRIPE_PUBLISHABLE_KEY` (frontend build-time) |

---

## Setting Env Vars via CLI

```bash
# Example: add MONGO_URI non-interactively
printf "mongodb+srv://aryan:aryan@cluster0.e5kuyrr.mongodb.net/CinemaSync_DB" | \
  npx vercel env add MONGO_URI production --force

# Trigger a fresh deploy after setting vars
npx vercel --prod
```

---

## Auto-Deploy (GitHub Integration)

1. Connect repo to Vercel via GitHub integration
2. Every push to `master` triggers:
   - Vercel build (`client/` static build + `api/` serverless function)
   - Automatic deploy to production URL
3. No manual deploy needed for normal feature pushes

---

## CI/CD Pipeline (GitHub Actions)

Located in `.github/workflows/`:

**On every push to `master`:**

1. **Integration tests** — runs `npm test` in `api/` against a local MongoDB instance
2. **Vercel deploy** — triggered automatically by GitHub integration (not via Actions)
3. **Post-deploy smoke test** — waits 90s then hits production `/api/health` and `/api/movies`

**Required GitHub Secrets:**
- `VERCEL_PROD_URL` — e.g., `https://cinema-sync-six.vercel.app` (enables smoke test)

---

## Vercel Project Configuration

### Build Settings

| Setting | Value |
|---------|-------|
| Framework | Other |
| Root Directory | `/` (monorepo root) |
| Build Command | Defined in `vercel.json` |
| Output Directory | Defined in `vercel.json` |

### Google OAuth Authorized Origins

In Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client:

- Authorized JavaScript origins:
  - `https://cinema-sync-six.vercel.app`
  - `http://localhost:5173` (for local dev)
- Authorized redirect URIs: not required (we use implicit flow via credential callback)

---

## MongoDB Atlas Setup

- Cluster: M0 (free tier)
- Database: `CinemaSync_DB`
- Collections: `users`, `movies`, `shows`, `seats`, `bookings`, `bookingintents`, `tickets`, `scanlogs`
- IP Whitelist: `0.0.0.0/0` (required for Vercel — serverless IPs change)
- Indexes: created automatically by Mongoose on first connection

**Seed database after first deploy:**
```bash
MONGO_URI="mongodb+srv://aryan:aryan@cluster0.e5kuyrr.mongodb.net/CinemaSync_DB?retryWrites=true&w=majority" \
  node api/seed/seedData.js
```

---

## Stripe Webhook Setup (Production)

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://cinema-sync-six.vercel.app/api/stripe/webhook`
3. Events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET` in Vercel

---

## Rollback

```bash
# List recent deployments
npx vercel ls

# Roll back to a previous deployment
npx vercel rollback <deployment-url>
```

---

## Monitoring

- **Vercel dashboard** → Deployments → Functions tab shows invocation count, errors, and durations per serverless function
- **Atlas monitoring** → Cluster → Metrics shows connection count, ops/sec, query latency
- **GitHub Actions** → Actions tab shows CI run status and smoke test results
