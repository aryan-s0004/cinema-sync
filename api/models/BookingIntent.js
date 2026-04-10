const mongoose = require("mongoose");

const bookingIntentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    show: { type: mongoose.Schema.Types.ObjectId, ref: "Show", required: true },
    seatIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Seat" }],
    step: {
      type: String,
      enum: ["seat_selection", "payment", "confirmation"],
      default: "seat_selection",
    },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    paymentTransactionId: { type: String, default: null },
    lockUntil: { type: Date, default: null },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

bookingIntentSchema.index({ user: 1, active: 1, updatedAt: -1 });
bookingIntentSchema.index({ user: 1, show: 1, active: 1 }, { unique: true, partialFilterExpression: { active: true } });
bookingIntentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("BookingIntent", bookingIntentSchema);
