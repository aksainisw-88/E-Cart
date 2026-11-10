const mongoose = require("mongoose");
const { createTenantModel } = require("../utils/tenantDatabase");

const storeResetOtpSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0, min: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

module.exports = createTenantModel("StoreResetOtp", storeResetOtpSchema);
