const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  status: { type: String, trim: true, lowercase: true, enum: ["open", "in_progress", "resolved"], default: "open" },
  adminReply: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("SupportTicket", supportTicketSchema);