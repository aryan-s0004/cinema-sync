# CinemaSync

CinemaSync is a full-stack MERN movie discovery and seat-booking platform with TMDB integration, protected booking flow, ticket PDF generation, and secure one-time QR entry validation.

## Monorepo Structure

- `backend/`: Express + MongoDB API
- `frontend/`: React + Vite UI
- `tickets/`: Generated ticket artifacts (runtime)

## Backend Features

- JWT auth (access + refresh)
- Movies and showtime APIs
- Seat locking with expiry
- Booking and payment confirmation flow
- Signature-verified mock webhook for payment confirmation
- Ticket generation + ticket retrieval APIs
- Admin scan API with one-time ticket consumption (anti-reuse)
- Request validation + sanitization + rate limiting
- Integration tests using Node test runner + Supertest

## Frontend Features

- Movie discovery and search
- Movie details and show selection
- Seat selection and booking
- Mock payment + confirmation
- Dashboard with booking history and watchlist
- Google Sign-In (ID token verification + JWT session)
- AI-assisted recommendation blocks (home + post-booking)

## Quick Start

### 1) Backend

```powershell
cd backend
copy .env.example .env
npm install
npm run seed
npm test
npm run dev
```

### 2) Frontend

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

## Google Auth Setup

1. Create a Web OAuth client in Google Cloud Console.
2. Add allowed JS origins:
   - `http://localhost:5173`
3. Copy the Google client ID into:
   - `frontend/.env` as `VITE_GOOGLE_CLIENT_ID`
   - `backend/.env` as `GOOGLE_CLIENT_ID`
4. Restart both backend and frontend after updating env values.

The app login page supports both:
- Email/password + OTP flow
- Google Sign-In flow
- Phone OTP flow (when user has a linked phone number)

## Phone OTP Setup (Real SMS)

Use either Twilio or Fast2SMS in `backend/.env`:

Twilio:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

Fast2SMS:
- `FAST2SMS_API_KEY`
- `FAST2SMS_SENDER_ID`

Fallback:
- `SMS_FALLBACK_TO_LOG=true` keeps dev/test usable without paid SMS credentials.

Login behavior:
- Choose `OTP via Email` or `OTP via Phone` on login page.
- Phone OTP requires user to have a phone saved during registration.

## Ticket Scan Security (Admin)

- Signed QR payload is embedded in each generated ticket.
- Scan endpoint validates signature + entry window and marks ticket as used on first successful scan.
- Duplicate scans are rejected.

Endpoint:

```text
POST /api/tickets/scan/validate
```

Auth:
- Requires admin role (`Bearer` token).

Payload:

```json
{
  "qrData": "cinemasync://ticket/scan?token=...",
  "consume": true,
  "gate": "Gate A",
  "deviceId": "scanner-01"
}
```

## Default Local URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000/api`
- Health endpoint: `http://localhost:5000/api/health`

## Production Readiness Notes

- Keep secrets only in `.env` / secret manager
- Use a managed MongoDB instance in production
- Replace in-memory cache and rate limiter with Redis for horizontal scaling
- Keep payment confirmation provider-authoritative (webhook signature verification)

## Day 4 Security Notes

- Payment confirmation now supports signature-verified provider callback flow:
  - `POST /api/payments/webhook/mock`
- Webhook payload includes unique `eventId` to prevent replay/reprocessing.
- Auth diagnostics routes are admin-protected:
  - `/api/auth/test`
  - `/api/auth/email-health`
  - `/api/auth/sms-health`
