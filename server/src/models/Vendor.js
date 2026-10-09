const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    address: { type: String, trim: true, default: "" },
    pendingAmount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Vendor", vendorSchema);
