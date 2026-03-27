const Movie = require("../models/Movie");
const Show = require("../models/Show");
const Seat = require("../models/Seat");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { parsePositiveInt } = require("../validators/common");

const generateSeatsForShow = async (showId, totalSeats) => {
  const seats = [];
  const rows = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const seatsPerRow = 10;

  for (let i = 1; i <= totalSeats; i += 1) {
    const rowIndex = Math.floor((i - 1) / seatsPerRow);
    const row = rows[rowIndex] || `R${rowIndex + 1}`;
    const number = ((i - 1) % seatsPerRow) + 1;

    let type = "standard";
    if (rowIndex <= 1) type = "vip";
    else if (rowIndex <= 3) type = "premium";

    seats.push({ show: showId, row, number, type });
  }

  await Seat.insertMany(seats, { ordered: false });
};

const createDefaultShowsForMovie = async (movieId) => {
  const base = new Date();
  base.setMinutes(0, 0, 0);
  const slots = [2, 5, 8];

  for (let i = 0; i < slots.length; i += 1) {
    const showTime = new Date(base.getTime() + slots[i] * 60 * 60 * 1000);
    const doc = await Show.findOneAndUpdate(
      {
        movie: movieId,
        theatreName: "CinemaSync Multiplex",
        screenName: `Screen ${i + 1}`,
        showTime,
      },
      {
        $setOnInsert: {
          movie: movieId,
          theatreName: "CinemaSync Multiplex",
          screenName: `Screen ${i + 1}`,
          showTime,
          price: 220 + i * 30,
          totalSeats: 60,
          status: "active",
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    const seatCount = await Seat.countDocuments({ show: doc._id });
    if (!seatCount) {
      await generateSeatsForShow(doc._id, doc.totalSeats);
    }
  }
};

const getAllShows = async (req, res, next) => {
  try {
    const { movieId, date } = req.query;
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const skip = (page - 1) * limit;
    const filter = { status: "active" };

    if (movieId) filter.movie = movieId;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      filter.showTime = { $gte: start, $lt: end };
    }

    let [shows, total] = await Promise.all([
      Show.find(filter)
        .populate({ path: "movie", select: "title posterPath language rating releaseDate" })
        .sort({ showTime: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Show.countDocuments(filter),
    ]);

    if (movieId && shows.length === 0) {
      const movie = await Movie.findById(movieId);
      if (movie) {
        await createDefaultShowsForMovie(movieId);
        [shows, total] = await Promise.all([
          Show.find(filter)
            .populate({ path: "movie", select: "title posterPath language rating releaseDate" })
            .sort({ showTime: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          Show.countDocuments(filter),
        ]);
      }
    }

    res.json(
      new ApiResponse(200, shows, "Shows fetched", {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      })
    );
  } catch (error) {
    next(error);
  }
};

const getShowById = async (req, res, next) => {
  try {
    const show = await Show.findById(req.params.id)
      .populate({ path: "movie", select: "title posterPath language rating releaseDate" })
      .lean();
    if (!show) throw new ApiError(404, "Show not found");
    res.json(new ApiResponse(200, show, "Show fetched"));
  } catch (error) {
    next(error);
  }
};

const createShow = async (req, res, next) => {
  try {
    const { movie, theatreName, screenName, showTime, price, totalSeats } = req.body;
    if (!movie || !theatreName || !showTime || !price || !totalSeats) {
      throw new ApiError(400, "movie, theatreName, showTime, price and totalSeats are required");
    }

    const show = await Show.create({
      movie,
      theatreName,
      screenName: screenName || "Screen 1",
      showTime,
      price,
      totalSeats,
    });

    await generateSeatsForShow(show._id, show.totalSeats);
    res.status(201).json(new ApiResponse(201, show, "Show created"));
  } catch (error) {
    next(error);
  }
};

const deleteShow = async (req, res, next) => {
  try {
    const show = await Show.findByIdAndUpdate(req.params.id, { status: "cancelled" }, { new: true });
    if (!show) throw new ApiError(404, "Show not found");

    await Seat.updateMany(
      { show: show._id, status: { $in: ["available", "locked"] } },
      { $set: { status: "available", lockedBy: null, lockedUntil: null } }
    );

    res.json(new ApiResponse(200, null, "Show cancelled"));
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllShows, getShowById, createShow, deleteShow };
