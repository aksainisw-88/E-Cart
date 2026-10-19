const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true, default: "Home" },
  name: { type: String, trim: true, required: true },
  phone: { type: String, trim: true, required: true },
  address: { type: String, trim: true, required: true },
  city: { type: String, trim: true, required: true },
  pincode: { type: String, trim: true, required: true },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    address: { type: String, trim: true, maxlength: 300, default: "" },
    locality: { type: String, trim: true, maxlength: 120, default: "" },
    pincode: { type: String, trim: true, maxlength: 6, default: "" },
    district: { type: String, trim: true, maxlength: 120, default: "" },
    state: { type: String, trim: true, maxlength: 120, default: "" },
    panNumber: { type: String, trim: true, uppercase: true, maxlength: 10, default: "" },
    gender: { type: String, enum: ["", "Male", "Female", "Other", "Prefer not to say"], default: "" },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["customer", "admin", "manager", "user"],
      default: "customer",
    },
    customerType: { type: String, enum: ["B2C", "B2B"], default: "B2C" },
    customerSource: { type: String, enum: ["Online", "Offline"], default: "Online" },
    businessName: { type: String, trim: true, maxlength: 120, default: "" },
    gstin: { type: String, trim: true, uppercase: true, maxlength: 15, default: "" },
    location: { type: mongoose.Schema.Types.ObjectId, ref: "StoreLocation", default: null },
    status: {
      type: String,
      enum: ["Active", "Blocked"],
      default: "Active",
    },
    menuPermissions: {
      type: [String],
      default: undefined,
    },
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
