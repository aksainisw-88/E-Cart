const mongoose = require("mongoose");
const { connection } = require("../config/superAdminDatabase");

const leadHistorySchema = new mongoose.Schema({
  type: { type: String, enum: ["Inquiry", "Status", "Note", "Follow-up", "Invitation", "Conversion"], required: true },
  details: { type: String, trim: true, maxlength: 2000, default: "" },
  status: { type: String, trim: true, default: "" },
  createdBy: { type: String, trim: true, default: "Website" },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const leadSchema = new mongoose.Schema({
  leadId: { type: String, required: true, unique: true, trim: true },
  companyName: { type: String, required: true, trim: true, maxlength: 120 },
  contactPerson: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  mobile: { type: String, required: true, trim: true, maxlength: 30 },
  businessType: { type: String, required: true, trim: true, maxlength: 80 },
  inquiryType: { type: String, enum: ["General", "Demo", "Purchase"], default: "General" },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ["New", "Contacted", "Follow-up", "Interested", "Converted", "Rejected"], default: "New" },
  followUpAt: { type: String, trim: true, default: "" },
  invitationTokenHash: { type: String, select: false, default: "" },
  invitationExpiresAt: { type: Date, default: null },
  invitationSentAt: { type: Date, default: null },
  tenantId: { type: String, trim: true, lowercase: true, default: "" },
  storeSlug: { type: String, trim: true, lowercase: true, default: "" },
  history: { type: [leadHistorySchema], default: [] },
}, { timestamps: true, collection: "leads" });

leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ email: 1, createdAt: -1 });

module.exports = connection.model("Lead", leadSchema);
