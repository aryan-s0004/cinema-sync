const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ticketCode: { type: String, required: true, unique: true, trim: true },
    movieTitle: { type: String, required: true },
    theatreName: { type: String, required: true },
    screenName: { type: String, required: true },
    showTime: { type: Date, required: true },
    seatLabels: [{ type: String, required: true }],
    amount: { type: Number, required: true },
    status: { type: String, enum: ["active", "cancelled"], default: "active" },
    qrData: { type: String, required: true },
    filePath: { type: String, default: null },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ticketSchema.index({ user: 1, createdAt: -1 });
ticketSchema.index({ booking: 1, user: 1 });
ticketSchema.index({ ticketCode: 1 });

module.exports = mongoose.model("Ticket", ticketSchema);
