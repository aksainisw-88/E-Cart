const mongoose = require("mongoose");
const { connection } = require("../config/superAdminDatabase");

const tenantSignupOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true, collection: "tenantsignupotps" });

module.exports = connection.model("TenantSignupOtp", tenantSignupOtpSchema);
