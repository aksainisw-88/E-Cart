const mongoose = require("mongoose");

const taxCategorySchema = new mongoose.Schema({
  appliedOn: { type: String, enum: ["Sales", "Purchase", "Both"], required: true, default: "Both" },
  supplyType: { type: String, enum: ["Within State", "Interstate", "Any"], default: "Any" },
  taxType: { type: String, enum: ["GST", "VAT", "Other", "Stock Transfer"], default: "GST" },
  taxRate: { type: Number, required: true, min: 0, max: 100, default: 0 },
  form: { type: String, trim: true, default: "" },
  state: { type: String, trim: true, default: "" },
  forVat: { type: Boolean, default: false },
  taxCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 30, unique: true },
  description: { type: String, trim: true, maxlength: 180, default: "" },
  taxRatePostingAccount: { type: String, trim: true, maxlength: 120, default: "" },
  salesPurchasePostingAccount: { type: String, trim: true, maxlength: 120, default: "" },
  returnsPostingAccount: { type: String, trim: true, maxlength: 120, default: "" },
  claimsPostingAccount: { type: String, trim: true, maxlength: 120, default: "" },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("TaxCategory", taxCategorySchema);
