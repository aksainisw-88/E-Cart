const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  purchase: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase" },
  productName: { type: String, required: true, trim: true },
  variant: { type: String, trim: true, default: "" },
  batchNumber: { type: String, trim: true, default: "" },
  expiryDate: { type: Date },
  mrp: { type: Number, min: 0, default: 0 },
  unit: { type: String, trim: true, default: "unit" },
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  freeQuantity: { type: Number, min: 0, default: 0 },
  discount: { type: Number, min: 0, default: 0 },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const posSaleSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true, trim: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  customerName: { type: String, trim: true, default: "Walk-in Customer" },
  customerSource: { type: String, enum: ["Online", "Offline", "Walk-in"], default: "Walk-in" },
  location: { type: mongoose.Schema.Types.ObjectId, ref: "StoreLocation", required: true },
  items: { type: [saleItemSchema], required: true },
  subtotal: { type: Number, required: true, min: 0 },
  itemDiscount: { type: Number, min: 0, default: 0 },
  promotionDiscount: { type: Number, min: 0, default: 0 },
  discount: { type: Number, min: 0, default: 0 },
  taxRate: { type: Number, min: 0, default: 5 },
  tax: { type: Number, min: 0, default: 0 },
  total: { type: Number, required: true, min: 0 },
  paymentMode: { type: String, enum: ["Cash", "UPI", "Card", "Credit", "Cheque"], required: true },
  paymentStatus: { type: String, enum: ["Paid", "Pending"], default: "Paid" },
}, { timestamps: true });

module.exports = mongoose.model("PosSale", posSaleSchema);