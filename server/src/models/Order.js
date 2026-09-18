const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [{ product: mongoose.Schema.Types.ObjectId, name: String, price: Number, costPrice: Number, originalPrice: Number, discount: Number, discountAmount: Number, quantity: Number, image: String }],
    shipping: { name: String, phone: String, address: String, city: String, pincode: String },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0, min: 0 },
    promoCode: { type: String, trim: true, uppercase: true, default: "" },
    promoDiscount: { type: Number, default: 0, min: 0 },
    delivery: { type: Number, required: true },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["card", "razorpay", "cod", "phonepe", "paytm", "googlepay"], default: "card" },
    paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },
    utrNumber: { type: String, trim: true, default: "" },
    paymentNotes: { type: String, trim: true, default: "" },
    razorpayOrderId: { type: String, trim: true, default: "" },
    razorpayPaymentId: { type: String, trim: true, default: "" },
    razorpaySignature: { type: String, trim: true, default: "" },
    paidAt: { type: Date },
    status: { type: String, enum: ["Processing", "Shipped", "Delivered", "Cancelled"], default: "Processing" },
    cancelledAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);