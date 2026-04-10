const mongoose = require("mongoose");

const showSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true },
    theatreName: { type: String, required: true, trim: true },
    screenName: { type: String, default: "Screen 1" },
    showTime: { type: Date, required: true },
    price: { type: Number, required: true, min: 0 },
    totalSeats: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["active", "cancelled"], default: "active" },
  },
  { timestamps: true }
);

showSchema.index({ movie: 1, showTime: 1, theatreName: 1, screenName: 1 }, { unique: true });
showSchema.index({ status: 1, showTime: 1 });
showSchema.index({ movie: 1, status: 1, showTime: 1 });

module.exports = mongoose.model("Show", showSchema);
