const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    vendorInvoiceNumber: { type: String, trim: true, default: "" },
    referenceNumber: { type: String, trim: true, default: "" },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: "StoreLocation" },
    productName: { type: String, required: true, trim: true },
    batchNumber: { type: String, trim: true, default: "" },
    expiryDate: { type: Date },
    mrp: { type: Number, min: 0, default: 0 },
    rate: { type: Number, min: 0, default: 0 },
    quantity: { type: Number, required: true, min: 1 },
    freeQuantity: { type: Number, min: 0, default: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    discount: { type: Number, min: 0, default: 0 },
    taxRate: { type: Number, min: 0, max: 100, default: 0 },
    taxAmount: { type: Number, min: 0, default: 0 },
    amount: { type: Number, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, min: 0, default: 0 },
    paymentStatus: { type: String, enum: ["Pending", "Partially paid", "Paid"], default: "Pending" },
    purchaseDate: { type: Date, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Purchase", purchaseSchema);
