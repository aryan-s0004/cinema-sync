# CinemaSync Client

React + Vite client for the single-project Vercel deployment of CinemaSync.

## Stack

- React
- React Router
- Axios
- Tailwind CSS

## Environment

Create `.env` from `.env.example`:

```bash
VITE_API_URL=/api
```

## Run

```powershell
npm run build
npm run preview
```

## Core Pages

- `/` Home (trending + recommendations)
- `/search` Search movies
- `/movies/:movieId` Movie details + shows
- `/booking/:showId` Seat selection
- `/payment/:bookingId` Payment
- `/confirmation/:bookingId` Booking confirmation
- `/dashboard` User dashboard
- `/login`, `/register` Auth

## Notes

- Client uses access token + refresh token flow via axios interceptors.
- Booking pages require authenticated users.
