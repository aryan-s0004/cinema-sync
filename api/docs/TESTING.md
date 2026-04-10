# Backend Testing Guide

## Test Command

```powershell
cd backend
npm test
```

## Coverage Intent

Current integration tests include:

- Health endpoint success
- Auth register success and invalid payload handling
- Unauthorized access checks (401)
- Route not found checks (404)
- Controlled server error handling (500)
- Booking happy flow:
  - lock seats
  - create booking
  - create payment order
  - verify payment
  - ticket generation

## Seed + Test Flow

```powershell
cd backend
npm run seed
npm test
```

## Notes

- Tests use `MONGO_URI_TEST` if provided, else default to `cinemasync_test` DB.
- Tests are isolated and clear DB data before each test.
