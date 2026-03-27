const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const Theatre = require('../models/Theatre');
const Show = require('../models/Show');
const Seat = require('../models/Seat');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("DB Connected for Seeding...");

    await Movie.deleteMany();
    await Theatre.deleteMany();
    await Show.deleteMany();
    await Seat.deleteMany();

    const movie = await Movie.create({
      title: "Avengers Endgame",
      duration: 180,
      language: "English"
    });

    const theatre = await Theatre.create({
      name: "PVR Cinemas",
      city: "Delhi"
    });

    const show = await Show.create({
      movie: movie._id,
      theatre: theatre._id,
      price: 250,
      showTime: new Date()
    });

    const seats = [];

    for (let i = 1; i <= 20; i++) {
      seats.push({
        show: show._id,
        row: "A",
        number: i,
        status: "available"
      });
    }

    await Seat.insertMany(seats);

    console.log("? Seeding Completed");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedData();
