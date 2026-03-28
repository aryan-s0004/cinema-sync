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
      transactionId: { type: String, default: null },
      orderId: { type: String, default: null },
      method: { type: String, enum: ["upi", "card", "netbanking", null], default: null },
      methodRef: { type: String, default: null },
      paymentId: { type: String, default: null },
      signature: { type: String, default: null },
      status: {
        type: String,
        enum: ["initiated", "processing", "success", "failed", "created", "captured"],
        default: null,
      },
      locked: { type: Boolean, default: false },
      idempotencyKey: { type: String, default: null },
      gatewayTokenExpiresAt: { type: Date, default: null },
      paymentExpiresAt: { type: Date, default: null },
      otpHash: { type: String, default: null },
      otpExpiresAt: { type: Date, default: null },
      otpAttempts: { type: Number, default: 0 },
      initiatedAt: { type: Date, default: null },
      processingAt: { type: Date, default: null },
      confirmedAt: { type: Date, default: null },
      failedAt: { type: Date, default: null },
      attempts: { type: Number, default: 0 },
      failureReason: { type: String, default: null },
      webhookEventIds: [{ type: String }],
      webhookReceivedAt: { type: Date, default: null },
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
