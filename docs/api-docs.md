# CinemaSync — API Reference

Base URL (production): `https://cinema-sync-six.vercel.app/api`  
Base URL (local): `http://localhost:5000/api`

All authenticated endpoints require `Authorization: Bearer <access_token>` header.

---

## Response Envelope

**Success:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "...",
  "data": {},
  "meta": { "page": 1, "total": 42 }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Seat already locked",
  "data": null,
  "errors": []
}
```

---

## Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | — | Liveness check |

**Response:** `{ "success": true }`

---

## Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Register with email + password |
| POST | `/auth/verify-email` | — | Verify OTP from registration email |
| POST | `/auth/login` | — | Password login |
| POST | `/auth/login/otp/request` | — | Request OTP for OTP login |
| POST | `/auth/login/otp/verify` | — | Verify OTP + receive tokens |
| POST | `/auth/google` | — | Google OAuth (ID token from frontend) |
| POST | `/auth/refresh` | — | Rotate JWT pair using refresh token |
| GET | `/auth/me` | user | Get current user profile |
| POST | `/auth/logout` | user | Revoke refresh token |
| POST | `/auth/forgot-password/request` | — | Send reset OTP |
| POST | `/auth/forgot-password/verify` | — | Verify reset OTP |
| POST | `/auth/forgot-password/reset` | — | Set new password |

**Register body:**
```json
{ "name": "Aryan", "email": "aryan@example.com", "password": "Pass@12345" }
```

**Login body:**
```json
{ "email": "aryan@example.com", "password": "Pass@12345" }
```

**Google body:**
```json
{ "credential": "<Google ID token>" }
```

**Refresh body:**
```json
{ "refreshToken": "<refresh_token>" }
```

**Token pair response:**
```json
{
  "accessToken": "<jwt 15m>",
  "refreshToken": "<jwt 7d>",
  "user": { "_id": "...", "name": "Aryan", "email": "...", "role": "user" }
}
```

---

## Movies

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/movies` | — | Paginated movie list with search |
| GET | `/movies/trending` | — | Trending movies (cached 30–60s) |
| GET | `/movies/:id` | — | Movie detail |
| POST | `/movies` | admin | Create movie |
| PUT | `/movies/:id` | admin | Update movie |
| DELETE | `/movies/:id` | admin | Soft-delete movie |

**Query params for `GET /movies`:**
- `page` (default 1), `limit` (default 20)
- `search` — regex full-text search on title
- `genre` — filter by genre string

**Movie object:**
```json
{
  "_id": "...",
  "title": "Inception",
  "overview": "...",
  "language": "en",
  "duration": 148,
  "releaseDate": "2010-07-16",
  "rating": 8.8,
  "genres": ["Action", "Sci-Fi"],
  "posterPath": "https://...",
  "popularity": 95.4,
  "isActive": true
}
```

---

## Shows

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/shows` | — | List upcoming shows |
| GET | `/shows/:id` | — | Show detail |
| POST | `/shows` | admin | Create show |
| DELETE | `/shows/:id` | admin | Cancel show |

**Query params for `GET /shows`:**
- `movieId` — filter by movie
- `date` — ISO date string (YYYY-MM-DD)
- `page`, `limit`

**Show object:**
```json
{
  "_id": "...",
  "movie": { "_id": "...", "title": "..." },
  "startTime": "2025-05-01T14:30:00.000Z",
  "endTime": "2025-05-01T17:00:00.000Z",
  "screen": "Screen 1",
  "pricing": { "vip": 500, "premium": 350, "standard": 200 },
  "status": "scheduled"
}
```

---

## Seats

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/seats/:showId` | — | Full seat map for a show |
| POST | `/seats/lock` | user | Atomic seat lock (10 min) |
| POST | `/seats/suggest` | — | Seat suggestions |

**Seat map response:**
```json
{
  "seats": [
    { "_id": "...", "row": "A", "number": 1, "type": "vip", "status": "available" },
    { "_id": "...", "row": "B", "number": 3, "type": "premium", "status": "locked" }
  ]
}
```

**Lock body:**
```json
{ "showId": "...", "seatIds": ["id1", "id2"] }
```

**Lock response:** `200` with locked seat list, or `409 Conflict` if any seat already taken.

---

## Bookings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/bookings` | user | Create booking from locked seats |
| GET | `/bookings/my` | user | User's booking history |
| GET | `/bookings/:id` | user | Single booking detail |
| PATCH | `/bookings/:id/cancel` | user | Cancel booking + release seats |

**Create booking body:**
```json
{ "showId": "...", "seatIds": ["id1", "id2"] }
```

**Booking object:**
```json
{
  "_id": "...",
  "user": "...",
  "show": { "_id": "...", "startTime": "..." },
  "seats": [{ "row": "A", "number": 1, "type": "vip" }],
  "status": "pending_payment",
  "quote": {
    "baseAmount": 1000,
    "convenienceFee": 30,
    "gst": 185.4,
    "totalAmount": 1215.4
  },
  "expiresAt": "2025-05-01T14:40:00.000Z"
}
```

---

## Payments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/payments/initiate` | user | Start payment (mock or Stripe) |
| POST | `/payments/request-otp` | user | Request mock OTP (mock provider only) |
| POST | `/payments/confirm` | user | Confirm payment + issue ticket |
| GET | `/payments/status/:transactionId` | user | Check payment status |
| POST | `/payments/webhook/mock` | — | Mock webhook (HMAC-SHA256 verified) |
| POST | `/stripe/webhook` | — | Stripe webhook (signature verified) |

**Initiate body:**
```json
{ "bookingId": "..." }
```

**Initiate response (mock):**
```json
{ "paymentToken": "mock_tok_...", "provider": "mock" }
```

**Initiate response (Stripe):**
```json
{ "clientSecret": "pi_..._secret_...", "provider": "stripe" }
```

**Confirm body (mock):**
```json
{ "bookingId": "...", "paymentToken": "mock_tok_...", "otp": "123456" }
```

**Confirm body (Stripe):**
```json
{ "bookingId": "...", "paymentIntentId": "pi_..." }
```

---

## Tickets

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/tickets/my` | user | User's tickets |
| GET | `/tickets/booking/:bookingId` | user | Ticket for a booking |
| GET | `/tickets/download/:ticketCode` | user | Download PDF ticket |
| POST | `/tickets/scan/validate` | admin | Validate QR scan |

**Ticket object:**
```json
{
  "_id": "...",
  "ticketCode": "CS-ABC123-DEF456",
  "booking": "...",
  "user": "...",
  "show": { "startTime": "...", "screen": "..." },
  "movie": { "title": "...", "posterPath": "..." },
  "seats": [{ "row": "A", "number": 1, "type": "vip" }],
  "qrData": "<JWT>",
  "scanned": false,
  "isValid": true
}
```

**Scan validate body:**
```json
{ "qrData": "<JWT>", "gateId": "GATE-A", "deviceId": "scanner-01" }
```

---

## Recommendations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/recommend` | optional | AI + history-based recommendations |

**Body:**
```json
{ "mood": "thrilling", "genres": ["Action"], "limit": 6 }
```

If user is authenticated, booking history is factored in. Falls back to genre-match if OpenAI key is not configured.

---

## Booking Intent

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/booking-intent` | user | Get active booking intent |
| POST | `/booking-intent` | user | Save/update booking intent |
| DELETE | `/booking-intent` | user | Clear booking intent |

Used to resume a booking wizard after browser refresh.

---

## Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Validation error or bad request |
| 401 | Missing or expired JWT |
| 403 | Forbidden (wrong role or email unverified) |
| 404 | Resource not found |
| 409 | Conflict (seat locked, duplicate booking) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Mock Webhook Signing

For integration tests, sign the payload with HMAC-SHA256:

```js
const crypto = require("crypto");
const sig = crypto
  .createHmac("sha256", process.env.MOCK_WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest("hex");

// Header:
// x-mock-signature: sha256=<sig>
// x-mock-event-id: <uuid>
```
