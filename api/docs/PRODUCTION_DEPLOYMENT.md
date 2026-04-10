# CinemaSync Production Deployment

## Core Goals

- Keep secrets only in environment variables or a secret manager
- Run the API behind a reverse proxy such as Nginx or a managed load balancer
- Use HTTPS only
- Enable MongoDB backups and monitoring
- Keep `OTP_DEBUG_PREVIEW=false` in production
- Set `EMAIL_FALLBACK_TO_LOG=false` and `SMS_FALLBACK_TO_LOG=false` in production if real delivery is required

## Recommended Runtime

- Node.js 20+
- MongoDB with connection pooling enabled
- Process manager such as PM2 or a container orchestrator
- Reverse proxy with gzip/brotli, TLS termination, and request buffering

## Environment Checklist

- `NODE_ENV=production`
- `CLIENT_URL` set to the real frontend origin
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` rotated to long random values
- `TICKET_QR_SECRET` set
- `TMDB_API_KEY` set
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET` set when Stripe is active
- `ADMIN_NOTIFICATION_EMAIL` set only if operational alert emails are wanted
- `OTP_DEBUG_PREVIEW=false`
- `EMAIL_FALLBACK_TO_LOG=false`
- `SMS_FALLBACK_TO_LOG=false`

## Scaling Notes

- The API now uses compression, cache headers, bounded in-memory caches, and MongoDB pool settings
- For true multi-instance scale, replace in-memory rate limiting and cache with Redis
- For 2k+ concurrent active users, validate capacity with load testing before launch
- Keep ticket PDF generation and email delivery off the request thread if traffic becomes bursty

## Honest Capacity Note

The codebase is production-hardened, but no code-only change can honestly guarantee 2k concurrent users by itself.
That requires:

- Real infrastructure sizing
- Load testing
- Observability
- Database metrics
- Multi-instance or containerized deployment if traffic exceeds one node

## Suggested Load Test

Run authenticated read-heavy and booking-heavy scenarios separately.

Focus on:

- `GET /api/movies/trending`
- `GET /api/shows`
- `GET /api/seats/:showId`
- `POST /api/seats/lock`
- `POST /api/bookings`
- `POST /api/payments/initiate`

Measure:

- p95 latency
- error rate
- MongoDB CPU and connection usage
- memory growth
