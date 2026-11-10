const mongoose = require("mongoose");
const { connection } = require("../config/superAdminDatabase");

const subscriptionRequestSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  business: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, lowercase: true, trim: true },
  activeRequestEmail: { type: String, lowercase: true, trim: true, default: undefined },
  phone: { type: String, trim: true, maxlength: 30, default: "" },
  plan: { type: String, trim: true, maxlength: 40, default: "Annual" },
  notes: { type: String, trim: true, maxlength: 500, default: "" },
  status: { type: String, enum: ["Pending", "Processing", "Approved", "Rejected"], default: "Pending" },
  requestedAt: { type: String, required: true },
  reviewedAt: { type: String, default: "" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", default: null },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", default: null },
}, { timestamps: true, collection: "subscriptionrequests" });

subscriptionRequestSchema.index({ activeRequestEmail: 1 }, { unique: true, sparse: true });

module.exports = connection.model("SubscriptionRequest", subscriptionRequestSchema);
