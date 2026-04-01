const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Booking = require("../models/Booking");
const Movie = require("../models/Movie");
const Seat = require("../models/Seat");
const Show = require("../models/Show");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const { createOrUpdateTicketForBooking } = require("../services/ticketService");
const { DEFAULT_SHOW_TIMINGS, toNextShowTime } = require("../utils/showTimingCatalog");

const DEFAULT_TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "Pass@12345";
const TOTAL_SEATS_PER_SHOW = 60;

const THEATRES = [
  "CinemaSync Multiplex",
  "Skyline Screens",
  "Downtown IMAX",
  "Aurora Cinemas",
];

const MOVIE_CATALOG = [
  {
    title: "CinemaSync Launch Night",
    overview: "A high-voltage premiere night where one delayed signal could ruin the biggest event in the city.",
    language: "en",
    duration: 130,
    rating: 8.1,
    genres: ["Action", "Thriller"],
    popularity: 95,
    releaseDate: "2025-01-18",
    accent: "#ef4444",
    surface: "#111827",
  },
  {
    title: "Midnight Protocol",
    overview: "A cybercrime analyst uncovers a live attack hidden inside a luxury streaming launch.",
    language: "en",
    duration: 118,
    rating: 7.8,
    genres: ["Thriller", "Mystery"],
    popularity: 91,
    releaseDate: "2024-11-07",
    accent: "#06b6d4",
    surface: "#0f172a",
  },
  {
    title: "Shelter 42",
    overview: "Inside a fortified city shelter, strangers must work together when the outside world goes dark.",
    language: "en",
    duration: 124,
    rating: 7.9,
    genres: ["Drama", "Science Fiction"],
    popularity: 88,
    releaseDate: "2024-08-14",
    accent: "#eab308",
    surface: "#1f2937",
  },
  {
    title: "Velvet Heist",
    overview: "An elite crew plans a museum robbery during an award-season gala, only to discover they were invited on purpose.",
    language: "en",
    duration: 116,
    rating: 7.6,
    genres: ["Crime", "Action"],
    popularity: 84,
    releaseDate: "2024-05-03",
    accent: "#ec4899",
    surface: "#111827",
  },
  {
    title: "Monsoon Code",
    overview: "A weather scientist and a journalist race through Mumbai to stop a flood prediction model from being sabotaged.",
    language: "hi",
    duration: 122,
    rating: 8.0,
    genres: ["Drama", "Thriller"],
    popularity: 90,
    releaseDate: "2024-09-21",
    accent: "#22c55e",
    surface: "#0f172a",
  },
  {
    title: "Orbit Children",
    overview: "Three siblings raised on a failing orbital station make a one-way journey home to Earth.",
    language: "en",
    duration: 109,
    rating: 7.7,
    genres: ["Adventure", "Science Fiction"],
    popularity: 79,
    releaseDate: "2023-12-12",
    accent: "#8b5cf6",
    surface: "#111827",
  },
  {
    title: "The Last Interval",
    overview: "A classical pianist loses his memory between performances and starts hearing clues hidden in his own compositions.",
    language: "en",
    duration: 113,
    rating: 7.5,
    genres: ["Drama", "Music"],
    popularity: 74,
    releaseDate: "2023-10-18",
    accent: "#f97316",
    surface: "#1f2937",
  },
  {
    title: "Neon Frontier",
    overview: "A rookie pilot escorts refugees through a neon-soaked border corridor patrolled by corporate drones.",
    language: "en",
    duration: 127,
    rating: 8.3,
    genres: ["Action", "Science Fiction"],
    popularity: 93,
    releaseDate: "2025-02-02",
    accent: "#14b8a6",
    surface: "#0f172a",
  },
  {
    title: "Paper Kingdom",
    overview: "A suspended bureaucrat discovers the documents she shredded were the only evidence of a nationwide conspiracy.",
    language: "en",
    duration: 111,
    rating: 7.4,
    genres: ["Drama", "Mystery"],
    popularity: 69,
    releaseDate: "2023-07-28",
    accent: "#60a5fa",
    surface: "#111827",
  },
  {
    title: "Crimson Harbour",
    overview: "A coastal rescue diver investigates disappearances around a shipping port that officially does not exist.",
    language: "en",
    duration: 119,
    rating: 7.8,
    genres: ["Thriller", "Adventure"],
    popularity: 82,
    releaseDate: "2024-03-09",
    accent: "#fb7185",
    surface: "#0f172a",
  },
  {
    title: "Afterlight Express",
    overview: "Passengers on an overnight luxury train realize each cabin is travelling to a different future.",
    language: "en",
    duration: 121,
    rating: 8.2,
    genres: ["Mystery", "Science Fiction"],
    popularity: 87,
    releaseDate: "2025-02-28",
    accent: "#38bdf8",
    surface: "#111827",
  },
  {
    title: "Devon Playbook",
    overview: "A disgraced coach builds an underdog women’s football team while dodging the same media machine that ended his career.",
    language: "en",
    duration: 114,
    rating: 7.9,
    genres: ["Drama", "Sports"],
    popularity: 80,
    releaseDate: "2024-06-15",
    accent: "#84cc16",
    surface: "#1f2937",
  },
];

const SAMPLE_USERS = [
  {
    name: "Aarav Mehta",
    email: "aarav.demo@cinemasync.local",
    phone: "+919700000001",
    role: "user",
  },
  {
    name: "Siya Kapoor",
    email: "siya.demo@cinemasync.local",
    phone: "+919700000002",
    role: "user",
  },
  {
    name: "Kabir Nair",
    email: "kabir.demo@cinemasync.local",
    phone: "+919700000003",
    role: "user",
  },
  {
    name: "Naina Rao",
    email: "naina.admin@cinemasync.local",
    phone: "+919700000004",
    role: "admin",
  },
];

const SAMPLE_BOOKINGS = [
  { userEmail: "aarav.demo@cinemasync.local", movieTitle: "CinemaSync Launch Night", seatLabels: ["A1", "A2"], method: "card" },
  { userEmail: "siya.demo@cinemasync.local", movieTitle: "Midnight Protocol", seatLabels: ["B4", "B5", "B6"], method: "upi" },
  { userEmail: "kabir.demo@cinemasync.local", movieTitle: "Afterlight Express", seatLabels: ["C3", "C4"], method: "netbanking" },
];

const CANCELLED_BOOKINGS = [
  { userEmail: "aarav.demo@cinemasync.local", movieTitle: "Velvet Heist", seatLabels: ["D1", "D2"] },
];

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const buildSvgDataUri = (width, height, markup) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${markup}</svg>`
  )}`;

const buildPosterDataUri = ({ title, accent, surface }) =>
  buildSvgDataUri(
    500,
    750,
    `
      <defs>
        <linearGradient id="posterGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${surface}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
        <linearGradient id="posterOverlay" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="rgba(2,6,23,0.92)" />
          <stop offset="60%" stop-color="rgba(2,6,23,0.15)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <rect width="500" height="750" fill="url(#posterGradient)" />
      <rect width="500" height="750" fill="url(#posterOverlay)" />
      <circle cx="405" cy="125" r="98" fill="rgba(255,255,255,0.08)" />
      <circle cx="112" cy="156" r="58" fill="rgba(255,255,255,0.06)" />
      <rect x="38" y="42" width="154" height="30" rx="15" fill="rgba(2,6,23,0.45)" />
      <text x="57" y="62" fill="#fef2f2" font-size="14" font-family="Arial" font-weight="700">CINEMASYNC PICK</text>
      <rect x="42" y="452" width="190" height="6" rx="3" fill="rgba(255,255,255,0.18)" />
      <rect x="42" y="470" width="136" height="6" rx="3" fill="rgba(255,255,255,0.18)" />
      <text x="42" y="548" fill="#ffffff" font-size="44" font-family="Arial" font-weight="800">${title}</text>
      <text x="42" y="592" fill="rgba(255,255,255,0.82)" font-size="20" font-family="Arial">CinemaSync Premiere</text>
      <rect x="42" y="632" width="132" height="12" rx="6" fill="rgba(255,255,255,0.18)" />
      <rect x="42" y="656" width="204" height="12" rx="6" fill="rgba(255,255,255,0.18)" />
      <rect x="42" y="680" width="168" height="12" rx="6" fill="rgba(255,255,255,0.18)" />
    `
  );

const buildBackdropDataUri = ({ title, accent, surface }) =>
  buildSvgDataUri(
    1280,
    720,
    `
      <defs>
        <linearGradient id="backdropGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${surface}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
        <linearGradient id="backdropShade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="rgba(2,6,23,0.94)" />
          <stop offset="55%" stop-color="rgba(2,6,23,0.62)" />
          <stop offset="100%" stop-color="rgba(2,6,23,0.08)" />
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#backdropGradient)" />
      <rect width="1280" height="720" fill="url(#backdropShade)" />
      <circle cx="1030" cy="160" r="180" fill="rgba(255,255,255,0.07)" />
      <circle cx="1180" cy="520" r="120" fill="rgba(255,255,255,0.05)" />
      <rect x="84" y="120" width="184" height="34" rx="17" fill="rgba(255,255,255,0.09)" />
      <text x="108" y="143" fill="#f8fafc" font-size="16" font-family="Arial" font-weight="700">TRENDING TONIGHT</text>
      <text x="80" y="252" fill="#ffffff" font-size="92" font-family="Arial" font-weight="800">${title}</text>
      <text x="84" y="318" fill="rgba(255,255,255,0.74)" font-size="28" font-family="Arial">CinemaSync theatrical showcase</text>
      <rect x="84" y="372" width="390" height="14" rx="7" fill="rgba(255,255,255,0.16)" />
      <rect x="84" y="400" width="470" height="14" rx="7" fill="rgba(255,255,255,0.16)" />
      <rect x="84" y="428" width="328" height="14" rx="7" fill="rgba(255,255,255,0.16)" />
    `
  );

const createSeatBatch = (showId, totalSeats = TOTAL_SEATS_PER_SHOW) => {
  const rows = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const seatsPerRow = 10;
  const seats = [];

  for (let i = 1; i <= totalSeats; i += 1) {
    const rowIndex = Math.floor((i - 1) / seatsPerRow);
    const row = rows[rowIndex] || `R${rowIndex + 1}`;
    const number = ((i - 1) % seatsPerRow) + 1;

    let type = "standard";
    if (rowIndex <= 1) type = "vip";
    else if (rowIndex <= 3) type = "premium";

    seats.push({
      show: showId,
      row,
      number,
      type,
      status: "available",
    });
  }

  return seats;
};

const ensureSampleUser = async ({ name, email, phone, role }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    user = new User({
      name,
      email: normalizedEmail,
      phone,
      password: DEFAULT_TEST_PASSWORD,
      authProvider: "local",
      role,
      emailVerified: true,
      phoneVerified: true,
    });
  } else {
    user.name = name;
    user.phone = phone;
    user.password = DEFAULT_TEST_PASSWORD;
    user.authProvider = "local";
    user.role = role;
    user.emailVerified = true;
    user.phoneVerified = true;
    user.refreshToken = null;
  }

  await user.save();
  return user;
};

const removePreviousSeedData = async (seededTitles) => {
  const existingMovies = await Movie.find({ title: { $in: seededTitles } }).select("_id").lean();
  const movieIds = existingMovies.map((movie) => movie._id);
  if (!movieIds.length) {
    return;
  }

  const existingShows = await Show.find({ movie: { $in: movieIds } }).select("_id").lean();
  const showIds = existingShows.map((show) => show._id);
  if (showIds.length) {
    const existingBookings = await Booking.find({ show: { $in: showIds } }).select("_id").lean();
    const bookingIds = existingBookings.map((booking) => booking._id);

    if (bookingIds.length) {
      await Ticket.deleteMany({ booking: { $in: bookingIds } });
      await Booking.deleteMany({ _id: { $in: bookingIds } });
    }

    await Seat.deleteMany({ show: { $in: showIds } });
    await Show.deleteMany({ _id: { $in: showIds } });
  }

  await Movie.deleteMany({ _id: { $in: movieIds } });
};

const seedMoviesAndShows = async () => {
  const seededTitles = MOVIE_CATALOG.map((movie) => movie.title);
  await removePreviousSeedData(seededTitles);

  const now = new Date();
  const createdMovies = [];
  const showsByMovieTitle = new Map();
  const seatsByShowId = new Map();

  for (let index = 0; index < MOVIE_CATALOG.length; index += 1) {
    const entry = MOVIE_CATALOG[index];
    const movie = await Movie.create({
      title: entry.title,
      overview: entry.overview,
      language: entry.language,
      duration: entry.duration,
      releaseDate: new Date(entry.releaseDate),
      rating: entry.rating,
      genres: entry.genres,
      posterPath: buildPosterDataUri(entry),
      backdropPath: buildBackdropDataUri(entry),
      popularity: entry.popularity,
      providerSource: "database",
      providerMovieId: `seed-${slugify(entry.title)}`,
      isActive: true,
    });

    createdMovies.push(movie);
    const movieShows = [];

    for (let slotIndex = 0; slotIndex < 2; slotIndex += 1) {
      const catalogSlot = DEFAULT_SHOW_TIMINGS[(index * 2 + slotIndex) % DEFAULT_SHOW_TIMINGS.length];
      const referenceDate = new Date(now.getTime() + (index % 4) * 24 * 60 * 60 * 1000 + slotIndex * 2 * 60 * 60 * 1000);
      const show = await Show.create({
        movie: movie._id,
        theatreName: THEATRES[(index + slotIndex) % THEATRES.length],
        screenName: catalogSlot.screenName,
        showTime: toNextShowTime(catalogSlot, referenceDate),
        price: catalogSlot.price + (index % 3) * 20,
        totalSeats: TOTAL_SEATS_PER_SHOW,
        status: "active",
      });

      const seats = await Seat.insertMany(createSeatBatch(show._id, show.totalSeats), { ordered: false });
      movieShows.push(show);
      seatsByShowId.set(String(show._id), seats);
    }

    showsByMovieTitle.set(movie.title, movieShows);
  }

  return { createdMovies, showsByMovieTitle, seatsByShowId };
};

const getSeatDocsByLabels = (seatDocs, seatLabels) => {
  const labelSet = new Set(seatLabels.map((label) => String(label).toUpperCase()));
  return seatDocs.filter((seat) => labelSet.has(`${seat.row}${seat.number}`.toUpperCase()));
};

const createConfirmedBooking = async ({ user, show, seatDocs, sequence, method }) => {
  await Seat.updateMany(
    { _id: { $in: seatDocs.map((seat) => seat._id) } },
    { $set: { status: "booked", lockedBy: null, lockedUntil: null } }
  );

  const booking = await Booking.create({
    user: user._id,
    show: show._id,
    seats: seatDocs.map((seat) => seat._id),
    totalAmount: show.price * seatDocs.length,
    status: "confirmed",
    payment: {
      provider: "mock",
      transactionId: `seed_txn_${slugify(user.email)}_${sequence}`,
      orderId: `seed_order_${slugify(show._id)}_${sequence}`,
      paymentId: `seed_payment_${sequence}`,
      method: method || "card",
      status: "success",
      initiatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      confirmedAt: new Date(Date.now() - 90 * 60 * 1000),
      attempts: 1,
    },
  });

  const populatedBooking = await Booking.findById(booking._id).populate([{ path: "show", populate: [{ path: "movie" }] }, { path: "seats" }]);
  await createOrUpdateTicketForBooking(populatedBooking, user);
};

const createCancelledBooking = async ({ user, show, seatDocs, sequence }) => {
  await Booking.create({
    user: user._id,
    show: show._id,
    seats: seatDocs.map((seat) => seat._id),
    totalAmount: show.price * seatDocs.length,
    status: "cancelled",
    payment: {
      provider: "mock",
      transactionId: `seed_cancelled_${slugify(user.email)}_${sequence}`,
      orderId: `seed_cancelled_order_${slugify(show._id)}_${sequence}`,
      status: "failed",
      initiatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      failedAt: new Date(Date.now() - 150 * 60 * 1000),
      failureReason: "User abandoned checkout",
      attempts: 1,
    },
  });
};

const seedSampleBookings = async ({ usersByEmail, showsByMovieTitle, seatsByShowId }) => {
  let sequence = 1;

  for (const entry of SAMPLE_BOOKINGS) {
    const user = usersByEmail.get(entry.userEmail);
    const show = showsByMovieTitle.get(entry.movieTitle)?.[0];
    const seatDocs = getSeatDocsByLabels(seatsByShowId.get(String(show?._id)) || [], entry.seatLabels);

    if (user && show && seatDocs.length === entry.seatLabels.length) {
      await createConfirmedBooking({ user, show, seatDocs, sequence, method: entry.method });
      sequence += 1;
    }
  }

  for (const entry of CANCELLED_BOOKINGS) {
    const user = usersByEmail.get(entry.userEmail);
    const show = showsByMovieTitle.get(entry.movieTitle)?.[1] || showsByMovieTitle.get(entry.movieTitle)?.[0];
    const seatDocs = getSeatDocsByLabels(seatsByShowId.get(String(show?._id)) || [], entry.seatLabels);

    if (user && show && seatDocs.length === entry.seatLabels.length) {
      await createCancelledBooking({ user, show, seatDocs, sequence });
      sequence += 1;
    }
  }
};

const seedData = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI missing in backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("DB connected for seeding");

  const usersByEmail = new Map();
  for (const entry of SAMPLE_USERS) {
    const user = await ensureSampleUser(entry);
    usersByEmail.set(user.email, user);
  }

  const { createdMovies, showsByMovieTitle, seatsByShowId } = await seedMoviesAndShows();
  await seedSampleBookings({ usersByEmail, showsByMovieTitle, seatsByShowId });

  const showCount = await Show.countDocuments({ movie: { $in: createdMovies.map((movie) => movie._id) } });
  const bookingCount = await Booking.countDocuments({ user: { $in: [...usersByEmail.values()].map((user) => user._id) } });

  console.log(`Seed complete. Movies: ${createdMovies.length}, Shows: ${showCount}, Sample bookings: ${bookingCount}`);
  console.log(`Demo login password for seeded users: ${DEFAULT_TEST_PASSWORD}`);
};

seedData()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error("Seed failed:", error.message);
    try {
      await mongoose.disconnect();
    } catch (_err) {
      // ignore disconnect errors
    }
    process.exit(1);
  });
