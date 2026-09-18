const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  code: { type: String, trim: true, uppercase: true },
  offerType: { type: String, enum: ["discount", "buy_one_get_one", "buy_product_get_product"], default: "discount" },
  discountType: { type: String, enum: ["percentage", "flat"], default: "percentage" },
  discountValue: { type: Number, required: true, min: 0 },
  buyProduct: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  freeProduct: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  buyQuantity: { type: Number, min: 1, default: 1 },
  freeQuantity: { type: Number, min: 1, default: 1 },
  minOrder: { type: Number, default: 0, min: 0 },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  status: { type: String, enum: ["Active", "Draft", "Expired"], default: "Active" },
}, { timestamps: true });

module.exports = mongoose.model("Offer", offerSchema);