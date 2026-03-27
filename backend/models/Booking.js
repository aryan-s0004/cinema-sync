const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    show: { type: mongoose.Schema.Types.ObjectId, ref: "Show", required: true },
    seats: [{ type: mongoose.Schema.Types.ObjectId, ref: "Seat", required: true }],
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending_payment", "confirmed", "cancelled", "expired"],
      default: "pending_payment",
    },
    payment: {
      provider: { type: String, default: "mock" },
      orderId: { type: String, default: null },
      paymentId: { type: String, default: null },
      signature: { type: String, default: null },
      status: { type: String, enum: ["created", "captured", "failed"], default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
