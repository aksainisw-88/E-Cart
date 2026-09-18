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
    status: {
      type: String,
      enum: ["Active", "Blocked"],
      default: "Active",
    },
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);