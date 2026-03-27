const mongoose = require("mongoose");

const theatreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Theatre", theatreSchema);
