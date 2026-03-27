# CinemaSync Frontend

React + Vite client for CinemaSync.

## Stack

- React
- React Router
- Axios
- Tailwind CSS

## Environment

Create `.env` from `.env.example`:

```bash
VITE_API_URL=http://localhost:5000/api
```

## Run

```powershell
npm install
npm run dev
```

## Build

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

- Frontend uses access token + refresh token flow via axios interceptors.
- Booking pages require authenticated users.
