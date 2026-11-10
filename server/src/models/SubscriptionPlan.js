const mongoose = require("mongoose");
const { connection } = require("../config/superAdminDatabase");

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  nameKey: { type: String, required: true, trim: true, lowercase: true },
  description: { type: String, trim: true, maxlength: 500, default: "" },
  billingInterval: { type: String, enum: ["monthly", "yearly"], required: true },
  price: { type: Number, min: 0, required: true },
  active: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
}, { timestamps: true, collection: "subscriptionplans" });

subscriptionPlanSchema.index({ nameKey: 1, billingInterval: 1 }, { unique: true });

module.exports = connection.model("SubscriptionPlan", subscriptionPlanSchema);
