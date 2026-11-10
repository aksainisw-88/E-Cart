const mongoose = require("mongoose");
const { connection } = require("../config/superAdminDatabase");

const superAdminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ["super_admin"], default: "super_admin", immutable: true },
  status: { type: String, enum: ["Active", "Blocked"], default: "Active" },
}, { timestamps: true, collection: "superadmins" });

module.exports = connection.model("SuperAdmin", superAdminSchema);
