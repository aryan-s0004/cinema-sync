import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../ui/Button";

const formatRating = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "N/A";
  return numeric.toFixed(1);
};

const formatGenres = (movie) => {
  if (Array.isArray(movie?.genres) && movie.genres.length) {
    return movie.genres.slice(0, 2).join(" | ");
  }
  return "Action | Adventure";
};

const formatDuration = (movie) => {
  const duration = Number(movie?.duration);
  if (!Number.isFinite(duration) || duration <= 0) return "120 mins";
  return `${duration} mins`;
};

const getWatchInsight = (movie) => {
  const rating = Number(movie?.rating) || 0;
  const popularity = Number(movie?.popularity) || 0;

  if (rating >= 8.2) return "High critic score. Best with IMAX or Dolby format.";
  if (popularity >= 300) return "Crowd favorite right now. Book evening slots early.";
  return "Lower crowd density. Great pick for a relaxed watch.";
};

const getBestTime = (movie) => {
  const rating = Number(movie?.rating) || 0;
  if (rating >= 8) return "7:30 PM - 10:15 PM";
  if (rating >= 6.8) return "5:00 PM - 7:30 PM";
  return "11:00 AM - 2:00 PM";
};

const HeroCarousel = ({ movies = [], activeIntent = null }) => {
  const slides = useMemo(() => movies.slice(0, 5), [movies]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5600);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) {
    return (
      <section className="card-surface reveal-up p-8">
        <h1 className="text-3xl font-semibold text-white">Movies loading...</h1>
        <p className="mt-2 text-slate-400">We are preparing trending picks for your next booking.</p>
      </section>
    );
  }

  const movie = slides[activeIndex % slides.length];
  const movieId = movie?._id || movie?.tmdbId;
  const hasDbId = Boolean(movie?._id);
  const trailerSearch = encodeURIComponent(`${movie?.title || "movie"} official trailer`);
  const trailerUrl = `https://www.youtube.com/results?search_query=${trailerSearch}`;
  const heroImage = movie?.backdropPath || movie?.posterPath || "";

  return (
    <section className="reveal-up relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-slate-950">
      {heroImage ? <img src={heroImage} alt={movie?.title || "Featured movie"} className="absolute inset-0 h-full w-full object-cover" /> : null}
      <div className="hero-shimmer absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-slate-950/95" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(34,211,238,0.2),transparent_34%)]" />

      <div className="relative z-10 grid gap-8 p-6 md:p-8 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-100">
            <span>Hot Release</span>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            <span>Auto Preview</span>
          </div>

          <h1 className="max-w-2xl text-3xl font-semibold leading-tight text-white md:text-5xl">{movie?.title || "Featured Movie"}</h1>
          <p className="text-sm text-slate-200 md:text-base">
            <span className="font-medium text-white">Rating {formatRating(movie?.rating)}</span>
            <span className="mx-2 text-slate-400">|</span>
            <span>{formatDuration(movie)}</span>
            <span className="mx-2 text-slate-400">|</span>
            <span>{formatGenres(movie)}</span>
          </p>

          <p className="max-w-xl text-sm leading-7 text-slate-300 md:text-base">{movie?.overview || "No plot summary available yet."}</p>

          <div className="flex flex-wrap gap-3">
            {hasDbId ? (
              <Link to={`/movies/${movieId}`}>
                <Button className="rounded-xl px-5 py-2.5 text-sm">Book Now</Button>
              </Link>
            ) : (
              <Button className="rounded-xl px-5 py-2.5 text-sm" disabled>
                Book Now
              </Button>
            )}

            <a
              href={trailerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-cyan-300/40 bg-slate-900/40 px-5 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/15"
            >
              Watch Trailer
            </a>
          </div>

          <div className="flex items-center gap-2">
            {slides.map((item, index) => {
              const isActive = activeIndex === index;
              return (
                <button
                  key={item._id || item.tmdbId || index}
                  type="button"
                  className={`h-2.5 rounded-full transition ${isActive ? "w-8 bg-cyan-300" : "w-2.5 bg-slate-500/70 hover:bg-slate-300"}`}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              );
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Smart Insight</p>
            <p className="mt-2 text-sm font-medium text-white">Best watch window: {getBestTime(movie)}</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">{getWatchInsight(movie)}</p>
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Booking Status</p>
            {activeIntent?.show?._id ? (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-slate-200">
                  Continue booking for <span className="font-semibold text-white">{activeIntent.show.movie?.title || "selected movie"}</span>
                </p>
                <Link
                  to={`/booking/${activeIntent.show._id}`}
                  className="inline-flex rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/25"
                >
                  Resume Booking
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-300">No pending bookings. Start with today&apos;s trending list below.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
};

export default HeroCarousel;
