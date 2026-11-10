const mongoose = require("mongoose");
const { connection } = require("../config/superAdminDatabase");

const businessSegmentSchema = new mongoose.Schema({
  segmentId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  code: { type: String, required: true, unique: true, trim: true, uppercase: true, match: /^[A-Z][A-Z0-9_]{1,39}$/ },
  description: { type: String, trim: true, maxlength: 300, default: "" },
  baseProfile: {
    type: String,
    enum: ["pharmacy", "garments", "footwear", "supermarket", "grocery", "electronics", "beauty", "home_living", "furniture", "jewelry", "toys", "books_stationery", "sports", "pet_supplies", "general"],
    default: "general",
  },
  enabled: { type: Boolean, default: true },
}, { timestamps: true, collection: "businesssegments" });

businessSegmentSchema.index({ enabled: 1, name: 1 });

module.exports = connection.model("BusinessSegment", businessSegmentSchema);
