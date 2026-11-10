const mongoose = require("mongoose");
const { connection } = require("../config/superAdminDatabase");

const historySchema = new mongoose.Schema({
  date: { type: String, required: true },
  amount: { type: Number, min: 0, required: true },
  type: { type: String, required: true },
  status: { type: String, enum: ["Paid", "Partial", "Unpaid"], required: true },
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  business: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, maxlength: 30, default: "" },
  registrationNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  licenseKeyHash: { type: String, required: true, select: false },
  registeredAt: { type: String, required: true },
  activatedAt: { type: String, required: true },
  validFrom: { type: String, required: true },
  validTill: { type: String, required: true },
  amount: { type: Number, min: 0, default: 0 },
  paid: { type: Number, min: 0, default: 0 },
  paymentStatus: { type: String, enum: ["Paid", "Partial", "Unpaid"], default: "Unpaid" },
  status: { type: String, enum: ["Active", "Suspended"], default: "Active" },
  plan: { type: String, trim: true, default: "Annual" },
  billingInterval: { type: String, enum: ["monthly", "yearly"], default: "yearly" },
  history: { type: [historySchema], default: [] },
}, { timestamps: true, collection: "subscriptions" });

module.exports = connection.model("Subscription", subscriptionSchema);
