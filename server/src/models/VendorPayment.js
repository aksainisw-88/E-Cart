const mongoose = require("mongoose");

const vendorPaymentSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    purchase: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase" },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMode: { type: String, enum: ["Cash", "UPI", "Card", "Bank transfer", "Cheque"], default: "Cash" },
    paymentDate: { type: Date, required: true },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("VendorPayment", vendorPaymentSchema);
