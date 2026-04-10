import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
        <p className="mt-2 text-slate-400"> We are preparing trending picks for your next booking.</p>
      </section>
    );
  }

  const movie = slides[activeIndex % slides.length];
  const movieId = movie?._id || movie?.tmdbId;
  const hasDbId = Boolean(movie?._id);
  const trailerSearch = encodeURIComponent(`${movie?.title || "movie"} official trailer`);
  const trailerUrl = `https://www.youtube.com/results?search_query=${trailerSearch}`;
  const heroImage = movie?.backdropPath || movie?.posterPath || "";
  const resumeShowId = activeIntent?.show?._id || activeIntent?.show;
  const resumeSeatCount = Array.isArray(activeIntent?.seatIds) ? activeIntent.seatIds.length : 0;

  return (
    <section className="reveal-up relative overflow-hidden rounded-[2.5rem] border border-[#E50914]/20 bg-[#0a0a0b] shadow-2xl min-h-[500px]">
      <AnimatePresence mode="wait">
        <motion.div
           key={activeIndex}
           initial={{ opacity: 0, scale: 1.1 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0, scale: 0.95 }}
           transition={{ duration: 1.2, ease: "anticipate" }}
           className="absolute inset-0"
        >
          {heroImage ? (
            <img 
              src={heroImage} 
              alt={movie?.title || "Featured movie"} 
              className="h-full w-full object-cover opacity-50 grayscale-[10%] hover:grayscale-0 transition-all duration-1000" 
            />
          ) : null}
        </motion.div>
      </AnimatePresence>
      
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0b] via-[#0a0a0b]/80 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-[#0a0a0b] to-transparent" />

      <div className="relative z-20 grid gap-8 p-8 lg:p-14 lg:grid-cols-[1.35fr_0.65fr] items-center min-h-[500px]">
        <motion.div 
          key={`content-${activeIndex}`}
           initial={{ x: -50, opacity: 0 }} 
           animate={{ x: 0, opacity: 1 }} 
           transition={{ duration: 0.8, delay: 0.2 }}
           className="space-y-6"
        >
          <div className="inline-flex items-center gap-3 rounded-full border border-[#E50914]/40 bg-[#E50914]/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-[#E50914]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-ping" />
            Trending Release
          </div>

          {resumeShowId ? (
            <Link
              to={`/booking/${resumeShowId}`}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-200 no-underline"
            >
              Resume Booking
              <span className="text-emerald-100/70">{resumeSeatCount} seats held</span>
            </Link>
          ) : null}

          <h1 className="max-w-xl text-5xl font-black leading-tight text-white md:text-7xl tracking-tighter uppercase italic">{movie?.title || "Featured Movie"}</h1>
          
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-white/50">
            <span className="text-[#10b981] drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">CRITIC {formatRating(movie?.rating)}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <span>{formatDuration(movie)}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <span>{formatGenres(movie)}</span>
          </div>

          <p className="max-w-lg text-sm leading-relaxed text-white/60 md:text-base font-medium line-clamp-3">{movie?.overview || "Experience the cinematic spectacle on the big screen with Dolby Atmos. Booking now open across all CinemaSync venues."}</p>

          <div className="flex flex-wrap gap-4 pt-4">
            {hasDbId ? (
              <Link to={`/movies/${movieId}`}>
                <Button className="rounded-2xl px-8 py-4 bg-[#E50914] text-white font-black hover:bg-[#FF1522] shadow-xl shadow-[#E50914]/20 scale-100 hover:scale-105 transition-all outline-none border-none">
                  BOOK TICKETS NOW
                </Button>
              </Link>
            ) : (
              <Button className="rounded-2xl px-8 py-4 bg-[#E50914] text-white font-black opacity-50 outline-none border-none" disabled>
                PREVIEW ONLY
              </Button>
            )}

            <a
              href={trailerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all no-underline"
            >
              Watch Trailer
            </a>
          </div>

          <div className="flex items-center gap-3 pt-6">
            {slides.map((item, index) => {
              const isActive = activeIndex === index;
              return (
                <button
                  key={item._id || item.tmdbId || index}
                  type="button"
                  className={`h-1.5 rounded-full transition-all duration-500 border-none outline-none cursor-pointer ${isActive ? "w-12 bg-[#E50914]" : "w-4 bg-white/10 hover:bg-white/30"}`}
                  onClick={() => setActiveIndex(index)}
                />
              );
            })}
          </div>
        </motion.div>

        <motion.aside 
          initial={{ opacity: 0, x: 50 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 1, delay: 0.5 }}
          className="hidden lg:block space-y-6"
        >
          <div className="rounded-[2.5rem] border border-white/10 bg-[#1a1a1e]/40 p-6 backdrop-blur-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#E50914]/10 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-[#E50914]/20 transition-all" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E50914] mb-3">CinemaSync Live Insights</p>
            <p className="text-xl font-black text-white italic mb-1 uppercase tracking-tighter">{getBestTime(movie)}</p>
            <p className="text-[10px] leading-relaxed text-white/40 font-bold uppercase tracking-widest">{getWatchInsight(movie)}</p>
          </div>

          <div className="rounded-[2.5rem] border border-white/10 bg-[#1a1a1e]/80 p-6 backdrop-blur-3xl relative overflow-hidden group min-h-[140px] flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E50914]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#E50914]/10 transition-all" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E50914] mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-pulse shadow-[0_0_8px_#E50914]" />
              Secured Cloud Booking
            </p>
            <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] leading-relaxed italic">
              Your session is encrypted and synced across all devices. We use industry-standard bank-grade security for all your bookings.
            </p>
          </div>
        </motion.aside>
      </div>
    </section>
  );
};

export default HeroCarousel;
