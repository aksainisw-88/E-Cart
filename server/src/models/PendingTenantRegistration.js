const mongoose = require("mongoose");
const { connection } = require("../config/superAdminDatabase");

const pendingTenantRegistrationSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true, trim: true, lowercase: true },
  leadId: { type: String, trim: true, default: "" },
  slug: { type: String, trim: true, lowercase: true, default: undefined },
  databaseName: { type: String, required: true, unique: true, trim: true },
  businessName: { type: String, required: true, trim: true, maxlength: 120 },
  businessType: { type: String, trim: true, default: "" },
  adminName: { type: String, required: true, trim: true, maxlength: 80 },
  adminEmail: { type: String, required: true, lowercase: true, trim: true },
  ownerPhone: { type: String, trim: true, maxlength: 30, default: "" },
  phone: { type: String, trim: true, maxlength: 30, default: "" },
  storeEmail: { type: String, lowercase: true, trim: true, default: "" },
  address: { type: String, trim: true, maxlength: 200, default: "" },
  city: { type: String, trim: true, maxlength: 80, default: "" },
  storeLogo: { type: String, trim: true, default: "" },
  theme: { type: String, trim: true, default: "teal" },
  status: { type: String, enum: ["Pending"], default: "Pending" },
}, { timestamps: true, collection: "pendingtenantregistrations" });

pendingTenantRegistrationSchema.index({ adminEmail: 1 }, { unique: true });
pendingTenantRegistrationSchema.index({ slug: 1 }, { unique: true, sparse: true });

module.exports = connection.model("PendingTenantRegistration", pendingTenantRegistrationSchema);
