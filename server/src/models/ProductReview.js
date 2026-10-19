const mongoose = require("mongoose");

const productReviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true, minlength: 3, maxlength: 1000 },
}, { timestamps: true });

productReviewSchema.index({ product: 1, customer: 1, order: 1 }, { unique: true });

module.exports = mongoose.model("ProductReview", productReviewSchema);
