# Backend API Reference

Base URL: `http://localhost:5000/api`

## Health
- `GET /health`

## Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me` (Bearer)
- `POST /auth/logout` (Bearer)

## Movies
- `GET /movies?page=1&limit=20&search=...`
- `GET /movies/trending?page=1&limit=20`
- `GET /movies/:id`
- `POST /movies` (Admin)
- `PUT /movies/:id` (Admin)
- `DELETE /movies/:id` (Admin)

## Shows
- `GET /shows?page=1&limit=20&movieId=...&date=...`
- `GET /shows/:id`
- `POST /shows` (Admin)
- `DELETE /shows/:id` (Admin)

## Seats / Booking / Payment
- `GET /seats/:showId`
- `POST /seats/lock` (Bearer)
- `POST /bookings` (Bearer)
- `GET /bookings/my?page=1&limit=20` (Bearer)
- `GET /bookings/:id` (Bearer)
- `PATCH /bookings/:id/cancel` (Bearer)
- `POST /payments/create-order` (Bearer)
- `POST /payments/verify` (Bearer)

## Recommendation
- `POST /recommend`

## Tickets
- `GET /tickets/my?page=1&limit=20` (Bearer)
- `GET /tickets/booking/:bookingId` (Bearer)
- `GET /tickets/download/:ticketCode` (Bearer)

## Response Pattern

Success:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "...",
  "data": {},
  "meta": {}
}
```

Error:
```json
{
  "success": false,
  "message": "...",
  "data": null,
  "errors": []
}
```
