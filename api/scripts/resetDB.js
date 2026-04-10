const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Movie = require("../models/Movie");
const Show = require("../models/Show");
const Seat = require("../models/Seat");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Ticket = require("../models/Ticket");
const { DEFAULT_SHOW_TIMINGS, toNextShowTime } = require("../utils/showTimingCatalog");

const USERS_TO_ADD = [
  { name: "Aryan Sahu", email: "aryansahu0004@gmail.com", password: "Password123", role: "admin" },
  { name: "Satvik Jain", email: "aryanhashcoder009@gmail.com", password: "Password123", role: "user" }
];

const MOVIES_TO_ADD = [
  {
    title: "Avatar: The Way of Water",
    overview: "Jake Sully lives with his newfound family formed on the extrasolar moon Pandora. Once a familiar threat returns to finish what was previously started, Jake must work with Neytiri and the army of the Na'vi race to protect their home.",
    language: "en",
    duration: 192,
    rating: 7.7,
    genres: ["Action", "Adventure", "Sci-Fi"],
    posterPath: "https://image.tmdb.org/t/p/original/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/mY7YPzJb722vofffe2p1fwZPfIW.jpg",
    popularity: 450,
    isActive: true
  },
  {
    title: "Oppenheimer",
    overview: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
    language: "en",
    duration: 180,
    rating: 8.1,
    genres: ["Drama", "History", "Action"],
    posterPath: "https://image.tmdb.org/t/p/original/8Gxv2mYnrnB6PjOTq9qSbsS1nqi.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/r7D9U0YexOqkPtr8Zp6uwwvU1uo.jpg",
    popularity: 380,
    isActive: true
  },
  {
    title: "Interstellar",
    overview: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
    language: "en",
    duration: 169,
    rating: 8.7,
    genres: ["Sci-Fi", "Drama", "Adventure"],
    posterPath: "https://image.tmdb.org/t/p/original/gEU2QniE6EwfVDxjvunQpX2qyju.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/rAiXKRqST9S9veH23R9Ws3JJY17.jpg",
    popularity: 320,
    isActive: true
  },
  {
    title: "The Batman",
    overview: "In his second year of fighting crime, Batman uncovers corruption in Gotham City that connects to his own family while facing a serial killer known as the Riddler.",
    language: "en",
    duration: 176,
    rating: 7.8,
    genres: ["Crime", "Drama", "Mystery"],
    posterPath: "https://image.tmdb.org/t/p/original/74xTEgt7R36Fpooo50r9T6f0uVt.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/5P8bi0YwoNp6FWoU6o6Uu19H3v5.jpg",
    popularity: 290,
    isActive: true
  },
  {
    title: "Dune: Part Two",
    overview: "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
    language: "en",
    duration: 166,
    rating: 8.3,
    genres: ["Sci-Fi", "Adventure", "Action"],
    posterPath: "https://image.tmdb.org/t/p/original/czembS0RhiERbtNR9TeeEsF0o9v.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/8mAn9mZ86RAnST6XLWp9o9YIqSj.jpg",
    popularity: 510,
    isActive: true
  }
];

const createSeatBatch = (showId, totalSeats = 60) => {
  const rows = "ABCDEFGH";
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

const resetDB = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI not found");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for thorough reset...");

    // Drop collections
    await User.deleteMany({});
    await Movie.deleteMany({});
    await Show.deleteMany({});
    await Seat.deleteMany({});
    await Booking.deleteMany({});
    await Ticket.deleteMany({});
    console.log("Database cleared.");

    // Add Users
    const users = await User.insertMany(USERS_TO_ADD);
    console.log(`Added ${users.length} users: Aryan Sahu & Satvik Jain.`);

    // Add Movies
    const movies = await Movie.insertMany(MOVIES_TO_ADD);
    console.log(`Added ${movies.length} premium movies.`);

    // Add Shows & Seats
    const now = new Date();
    let totalShows = 0;
    for (const movie of movies) {
      // Pick 2 random slots for each movie
      const slots = DEFAULT_SHOW_TIMINGS.slice(0, 2); 
      for (const slot of slots) {
        const show = await Show.create({
          movie: movie._id,
          theatreName: "CinemaSync IMAX",
          screenName: slot.screenName,
          showTime: toNextShowTime(slot, now),
          price: slot.price + (Math.random() > 0.5 ? 50 : 0),
          totalSeats: 60,
          status: "active",
        });
        totalShows++;
        await Seat.insertMany(createSeatBatch(show._id, 60));
      }
    }
    console.log(`Initialized ${totalShows} live shows with seat mappings.`);

    console.log("FULL DATABASE REFRESH COMPLETE.");
    process.exit(0);
  } catch (err) {
    console.error("Reset failed:", err.message);
    process.exit(1);
  }
};

resetDB();
