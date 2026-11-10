const mongoose = require("mongoose");
const { createTenantModel } = require("../utils/tenantDatabase");

const productCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  normalizedName: { type: String, required: true, unique: true, lowercase: true, trim: true },
  builtInKey: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: "ProductCategory", default: null },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = createTenantModel("ProductCategory", productCategorySchema);