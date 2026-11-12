const mongoose = require("mongoose");
const { connection } = require("../config/superAdminDatabase");

const tenantSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true, trim: true, lowercase: true },
  databaseName: { type: String, required: true, unique: true, trim: true },
  businessName: { type: String, required: true, trim: true, maxlength: 120 },
  businessType: { type: String, trim: true, default: "" },
  adminEmail: { type: String, required: true, lowercase: true, trim: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", required: true, unique: true },
  status: { type: String, enum: ["PendingActivation", "Active", "Suspended"], default: "Active" },
}, { timestamps: true, collection: "tenants" });

tenantSchema.index({ adminEmail: 1, tenantId: 1 }, { unique: true });

module.exports = connection.model("Tenant", tenantSchema);
