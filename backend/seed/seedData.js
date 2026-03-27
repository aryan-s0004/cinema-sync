const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Movie = require("../models/Movie");
const Show = require("../models/Show");
const Seat = require("../models/Seat");

const createSeatBatch = (showId, totalSeats = 60) => {
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

const seedData = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI missing in backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("DB connected for seeding");

  await Seat.deleteMany({});
  await Show.deleteMany({});
  await Movie.deleteMany({});

  const movie = await Movie.create({
    title: "CinemaSync Launch Night",
    overview: "Sample seeded movie for local booking flow testing.",
    language: "en",
    duration: 130,
    rating: 8.1,
    genres: ["Action", "Thriller"],
    posterPath: "",
    backdropPath: "",
    popularity: 75,
    isActive: true,
  });

  const showTimes = [2, 5, 8].map((hours) => new Date(Date.now() + hours * 60 * 60 * 1000));
  const shows = [];

  for (let i = 0; i < showTimes.length; i += 1) {
    const show = await Show.create({
      movie: movie._id,
      theatreName: "CinemaSync Multiplex",
      screenName: `Screen ${i + 1}`,
      showTime: showTimes[i],
      price: 220 + i * 20,
      totalSeats: 60,
      status: "active",
    });

    shows.push(show);
    await Seat.insertMany(createSeatBatch(show._id, show.totalSeats), { ordered: false });
  }

  console.log(`Seed complete. Movie: ${movie._id}, Shows: ${shows.length}`);
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
