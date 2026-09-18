const mongoose = require("mongoose");

const hoursSchema = new mongoose.Schema({
  open: { type: String, default: "09:00" },
  close: { type: String, default: "18:00" },
  closed: { type: Boolean, default: false },
}, { _id: false });

const storeSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "default" },
  name: { type: String, default: "My Medical Store" },
  tagline: { type: String, default: "Your Health, Our Priority" },
  description: { type: String, default: "Trusted healthcare products delivered with care, speed, and confidence." },
  logo: { type: String, default: "" },
  phone: { type: String, default: "1800-123-4567" },
  email: { type: String, default: "care@mymedicalstore.com" },
  address: { type: String, default: "New Delhi, India" },
  deliveryFee: { type: Number, default: 49, min: 0 },
  freeDeliveryAbove: { type: Number, default: 999, min: 0 },
  deliveryPincode: { type: String, trim: true, default: "" },
  deliveryRadiusKm: { type: Number, default: 10, min: 0 },
  deliveryLatitude: { type: Number, min: -90, max: 90 },
  deliveryLongitude: { type: Number, min: -180, max: 180 },
  deliveryPincodes: { type: [String], default: [] },
  theme: { type: String, enum: ["teal", "blue", "emerald", "amber"], default: "teal" },
  hours: { type: Map, of: hoursSchema, default: () => ({}) },
  paymentIntegrations: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  testimonials: { type: [{ name: String, message: String }], default: () => [] },
  heroSlides: { type: [{ eyebrow: String, title: String, description: String, button: String, to: String, image: String }], default: () => [] },
}, { timestamps: true });

module.exports = mongoose.model("StoreSettings", storeSettingsSchema);