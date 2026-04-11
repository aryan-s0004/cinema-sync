# CinemaSync — Local Development Setup

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB (local instance or Atlas connection string)
- Git

---

## 1. Clone & Install

```bash
git clone https://github.com/<your-username>/cinema-sync.git
cd cinema-sync

# Backend
cd api && npm install

# Frontend
cd ../client && npm install
```

---

## 2. Environment Variables

### Backend (`api/.env`)

Copy from the example:
```bash
cp api/.env.example api/.env
```

Fill in the required values:

```env
# Database
MONGO_URI=mongodb+srv://aryan:aryan@cluster0.e5kuyrr.mongodb.net/CinemaSync_DB?retryWrites=true&w=majority
MONGO_MAX_POOL_SIZE=5
MONGO_MIN_POOL_SIZE=1

# Auth
JWT_SECRET=your_long_random_secret_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Payment (use "mock" for local dev — no Stripe keys needed)
PAYMENT_PROVIDER=mock
STRIPE_SECRET_KEY=sk_test_...          # optional for local
STRIPE_PUBLISHABLE_KEY=pk_test_...     # optional for local
STRIPE_WEBHOOK_SECRET=whsec_...        # optional for local
MOCK_WEBHOOK_SECRET=mock_webhook_secret_local

# Movie source (use "database" for local — no TMDB key needed)
MOVIE_PROVIDER=database
TMDB_API_KEY=                          # optional

# Google OAuth
GOOGLE_CLIENT_ID=510088075115-2ir6th054c222ar5pfvj7gtdoaca200d.apps.googleusercontent.com

# Email (set to true to log emails to console instead of sending)
EMAIL_FALLBACK_TO_LOG=true
SMS_FALLBACK_TO_LOG=true

# Optional
OPENAI_API_KEY=                        # AI recommendations (falls back to genre-match if unset)
```

### Frontend (`client/.env`)

```bash
cp client/.env.example client/.env
```

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=510088075115-2ir6th054c222ar5pfvj7gtdoaca200d.apps.googleusercontent.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...   # optional for local
```

---

## 3. Start Development Servers

```bash
# Terminal 1 — Backend
cd api
node index.js
# or for hot reload:
npx nodemon index.js

# Terminal 2 — Frontend
cd client
npm run dev
```

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`
- API health check: `http://localhost:5000/api/health`

---

## 4. Seed the Database

Seeds 12 movies, 24 shows (2 per movie), 60 seats per show, and 2 demo users.

```bash
cd api
MONGO_URI="mongodb+srv://aryan:aryan@cluster0.e5kuyrr.mongodb.net/CinemaSync_DB?retryWrites=true&w=majority" node seed/seedData.js
```

Or if your `.env` is already set:
```bash
cd api && node seed/seedData.js
```

**Demo credentials after seeding:**
| Role | Email | Password |
|------|-------|----------|
| User | aarav.demo@cinemasync.local | Pass@12345 |
| Admin | naina.admin@cinemasync.local | Pass@12345 |

---

## 5. Run Tests

### Integration Tests
```bash
cd api
npm test
# or
node --test tests/
```

Tests spin up a local Express instance and hit a test MongoDB (configure `MONGO_URI_TEST` in `.env` or it falls back to `MONGO_URI`).

### Load Tests (k6)

Install k6:
```bash
# Windows
choco install k6

# macOS
brew install k6
```

Run smoke test (5 VUs, 30s):
```bash
cd performance-tests
k6 run scripts/01_health_movies.js
```

Run against production:
```bash
K6_BASE_URL=https://cinema-sync-six.vercel.app k6 run -e SCENARIO=load scripts/01_health_movies.js
```

Full suite:
```bash
bash run-all.sh
```

---

## 6. Utility Scripts

Located in `api/scripts/`:

```bash
# Check email delivery config
node api/scripts/emailDiagnostic.js

# Manage demo users (create/reset)
node api/scripts/manageUsers.js

# Reset database (drops all collections)
node api/scripts/resetDB.js
```

---

## 7. Common Issues

### "MONGO_URI is not configured"
- Ensure `api/.env` exists and contains a valid `MONGO_URI`
- Check Atlas IP whitelist: add `0.0.0.0/0` for development

### "language override unsupported: hi"
- Already fixed in `api/models/Movie.js` via `language_override: "_search_lang"` on the text index
- If the old index exists on Atlas, drop it: connect to Atlas → Database → Collections → movies → Indexes → drop `title_text`

### Google Sign-In "Not configured"
- Set `VITE_GOOGLE_CLIENT_ID` in `client/.env`
- Add `http://localhost:5173` to authorized JavaScript origins in Google Cloud Console

### OTP emails not arriving
- Set `EMAIL_FALLBACK_TO_LOG=true` — OTPs will print to the backend console instead of sending email
- Check `api/scripts/emailDiagnostic.js` output for SMTP config errors

### Cold start on Vercel (~500ms)
- Expected on the free tier. First request after idle is slow; subsequent requests are fast.
