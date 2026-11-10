const mongoose = require("mongoose");
const { createTenantModel } = require("../utils/tenantDatabase");

const passwordResetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

module.exports = createTenantModel("PasswordReset", passwordResetSchema);