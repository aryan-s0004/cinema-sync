const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
  {
    tmdbId: { type: Number, unique: true, sparse: true },
    providerSource: { type: String, default: "database", trim: true },
    providerMovieId: { type: String, default: null, trim: true },
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

movieSchema.index({ isActive: 1, popularity: -1, createdAt: -1 });
movieSchema.index({ providerSource: 1, providerMovieId: 1 }, { sparse: true });
// language_override prevents MongoDB from using the `language` field as a
// text-search language selector (which rejects values like "hi", "ta", etc.)
movieSchema.index({ title: "text" }, { language_override: "_search_lang" });

module.exports = mongoose.model("Movie", movieSchema);
