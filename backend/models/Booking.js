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
      transactionId: { type: String },
      orderId: { type: String },
      method: { type: String, enum: ["upi", "card", "netbanking", null] },
      methodRef: { type: String },
      paymentId: { type: String },
      signature: { type: String },
      status: {
        type: String,
        enum: ["initiated", "processing", "success", "failed", "created", "captured"],
      },
      locked: { type: Boolean, default: false },
      idempotencyKey: { type: String },
      gatewayTokenExpiresAt: { type: Date },
      paymentExpiresAt: { type: Date },
      otpHash: { type: String },
      otpExpiresAt: { type: Date },
      otpAttempts: { type: Number, default: 0 },
      initiatedAt: { type: Date },
      processingAt: { type: Date },
      confirmedAt: { type: Date },
      failedAt: { type: Date },
      attempts: { type: Number, default: 0 },
      failureReason: { type: String },
      webhookEventIds: [{ type: String }],
      webhookReceivedAt: { type: Date },
    },
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ show: 1, status: 1, createdAt: -1 });
bookingSchema.index({ status: 1, "payment.paymentExpiresAt": 1 });
bookingSchema.index({ "payment.orderId": 1 }, { sparse: true });
bookingSchema.index({ "payment.transactionId": 1 }, { sparse: true, unique: true });

module.exports = mongoose.model("Booking", bookingSchema);
