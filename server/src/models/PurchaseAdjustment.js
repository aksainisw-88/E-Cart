const mongoose = require("mongoose");

const purchaseAdjustmentSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
    location: { type: mongoose.Schema.Types.ObjectId, ref: "StoreLocation" },
    stockAdjustment: { type: Number, required: true },
    balanceAdjustment: { type: Number, required: true, default: 0 },
    reason: { type: String, required: true, trim: true },
    adjustmentDate: { type: Date, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PurchaseAdjustment", purchaseAdjustmentSchema);
