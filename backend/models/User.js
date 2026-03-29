const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: {
      type: String,
      minlength: 6,
      required() {
        return this.authProvider !== "google";
      },
    },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String, unique: true, sparse: true },
    avatar: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    refreshToken: { type: String, default: null },
    emailVerified: { type: Boolean, default: false },
    otp: {
      hash: { type: String, default: null },
      purpose: { type: String, enum: ["email_verification", "login"], default: null },
      expiresAt: { type: Date, default: null },
      attempts: { type: Number, default: 0 },
      lastSentAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function preSave() {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function matchPassword(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
