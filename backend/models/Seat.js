const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema(
  {
    show: { type: mongoose.Schema.Types.ObjectId, ref: "Show", required: true },
    row: { type: String, required: true },
    number: { type: Number, required: true },
    type: { type: String, enum: ["standard", "premium", "vip"], default: "standard" },
    status: { type: String, enum: ["available", "locked", "booked"], default: "available" },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

seatSchema.index({ show: 1, row: 1, number: 1 }, { unique: true });

module.exports = mongoose.model("Seat", seatSchema);
