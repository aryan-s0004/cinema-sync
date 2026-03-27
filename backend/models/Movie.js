const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
  {
    tmdbId: { type: Number, unique: true, sparse: true },
    title: { type: String, required: true, trim: true },
    overview: { type: String, default: "" },
    language: { type: String, default: "en" },
    duration: { type: Number, default: 120 },
    releaseDate: { type: Date },
    rating: { type: Number, default: 0, min: 0, max: 10 },
    genres: [{ type: String }],
    posterPath: { type: String, default: "" },
    backdropPath: { type: String, default: "" },
    popularity: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Movie", movieSchema);
