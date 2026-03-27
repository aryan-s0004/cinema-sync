# CinemaSync

CinemaSync is a full-stack MERN movie discovery and seat-booking platform with TMDB integration, protected booking flow, and ticket generation.

## Monorepo Structure

- `backend/`: Express + MongoDB API
- `frontend/`: React + Vite UI
- `tickets/`: Generated ticket artifacts (runtime)

## Backend Features

- JWT auth (access + refresh)
- Movies and showtime APIs
- Seat locking with expiry
- Booking and payment confirmation flow
- Ticket generation + ticket retrieval APIs
- Request validation + sanitization + rate limiting
- Integration tests using Node test runner + Supertest

## Frontend Features

- Movie discovery and search
- Movie details and show selection
- Seat selection and booking
- Mock payment + confirmation
- Dashboard with booking history and watchlist

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

## Default Local URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000/api`
- Health endpoint: `http://localhost:5000/api/health`

## Production Readiness Notes

- Keep secrets only in `.env` / secret manager
- Use a managed MongoDB instance in production
- Replace in-memory cache and rate limiter with Redis for horizontal scaling
- Add real payment gateway verification for production payments
