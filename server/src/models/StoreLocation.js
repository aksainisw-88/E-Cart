const mongoose = require("mongoose");

const storeLocationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 300, default: "" },
  phone: { type: String, trim: true, default: "" },
  email: { type: String, trim: true, lowercase: true, default: "" },
  address: { type: String, required: true, trim: true, minlength: 3 },
  city: { type: String, required: true, trim: true },
  pincode: { type: String, trim: true, default: "" },
  active: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

storeLocationSchema.index({ isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

module.exports = mongoose.model("StoreLocation", storeLocationSchema);