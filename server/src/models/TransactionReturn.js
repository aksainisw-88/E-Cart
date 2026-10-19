const mongoose = require("mongoose");

const returnItemSchema = new mongoose.Schema({
  sourceItemIndex: { type: Number, min: 0 },
  purchase: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase" },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true, trim: true },
  variant: { type: String, trim: true, default: "" },
  batchNumber: { type: String, trim: true, default: "" },
  expiryDate: { type: Date },
  quantity: { type: Number, required: true, min: 1 },
  unitRate: { type: Number, min: 0, default: 0 },
  amount: { type: Number, min: 0, default: 0 },
}, { _id: false });

const transactionReturnSchema = new mongoose.Schema({
  returnNumber: { type: String, required: true, unique: true, trim: true },
  type: { type: String, required: true, enum: ["Sales Return", "Replacement", "Purchase Return"] },
  invoiceDate: { type: Date, required: true },
  sourceEntryId: { type: String, required: true, trim: true },
  sourceEntryNo: { type: String, required: true, trim: true },
  sourceSale: { type: mongoose.Schema.Types.ObjectId, ref: "PosSale" },
  sourcePurchases: [{ type: mongoose.Schema.Types.ObjectId, ref: "Purchase" }],
  originalInvoiceDate: { type: Date },
  partyName: { type: String, trim: true, default: "" },
  reason: { type: String, trim: true, maxlength: 500, default: "" },
  location: { type: mongoose.Schema.Types.ObjectId, ref: "StoreLocation" },
  items: { type: [returnItemSchema], required: true },
  total: { type: Number, required: true, min: 0, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

transactionReturnSchema.index({ type: 1, invoiceDate: -1 });
transactionReturnSchema.index({ sourceSale: 1, type: 1 });
transactionReturnSchema.index({ sourcePurchases: 1, type: 1 });

module.exports = mongoose.model("TransactionReturn", transactionReturnSchema);
