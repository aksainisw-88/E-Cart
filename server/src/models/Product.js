const mongoose = require("mongoose");

const locationStockSchema = new mongoose.Schema({
  location: { type: mongoose.Schema.Types.ObjectId, ref: "StoreLocation", required: true },
  quantity: { type: Number, required: true, min: 0, default: 0 },
}, { _id: false });

const productVariantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true, default: "" },
  price: { type: Number, min: 0 },
  locationStock: { type: [locationStockSchema], default: [] },
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, trim: true, default: "" },
    unit: { type: String, trim: true, maxlength: 40, default: "unit" },
    category: { type: String, required: true, trim: true },
    purchaseTaxCategory: { type: mongoose.Schema.Types.ObjectId, ref: "TaxCategory" },
    salesTaxCategory: { type: mongoose.Schema.Types.ObjectId, ref: "TaxCategory" },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, min: 0, default: 0 },
    originalPrice: { type: Number, min: 0 },
    discount: { type: Number, min: 0, max: 100, default: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    locationStock: { type: [locationStockSchema], default: [] },
    variants: { type: [productVariantSchema], default: [] },
    vendorName: { type: String, trim: true, default: "" },
    purchaseDate: { type: Date },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviews: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ["Published", "Draft"], default: "Published" },
    image: { type: String, default: "" },
    images: { type: [String], default: [] },
    description: { type: String, trim: true, default: "" },
    returnEligible: { type: Boolean, default: true },
    replaceEligible: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", productSchema);
