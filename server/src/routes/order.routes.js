const crypto = require("crypto");
const express = require("express");
const { z } = require("zod");
const Order = require("../models/Order");
const StoreSettings = require("../models/StoreSettings");
const Offer = require("../models/Offer");
const Product = require("../models/Product");
const StoreLocation = require("../models/StoreLocation");
const User = require("../models/User");
const { requireAnyRole } = require("../middleware/auth");
const { calculateOfferDiscount } = require("../utils/offerPricing");

const router = express.Router();
const orderSchema = z.object({
  items: z.array(z.object({ id: z.string(), name: z.string(), price: z.coerce.number().min(0), originalPrice: z.coerce.number().min(0).optional(), discount: z.coerce.number().min(0).max(100).optional(), quantity: z.coerce.number().int().positive(), image: z.string().optional() })).min(1),
  shipping: z.object({ name: z.string().min(2), phone: z.string().min(10), address: z.string().min(3), city: z.string().min(2), pincode: z.string().min(6) }),
  paymentMethod: z.enum(["card", "razorpay", "cod", "phonepe", "paytm", "googlepay"]),
  storeId: z.string().optional(),
  promoCode: z.string().trim().max(50).optional().default(""),
});
const cancellationSchema = z.object({ reason: z.string().trim().min(3).max(500) });

const getRazorpayConfig = async (request) => {
  const settings = await StoreSettings.findOne({ key: "default" }).select("paymentIntegrations").lean();
  const integration = settings?.paymentIntegrations?.razorpay;
  if (integration?.enabled) {
    if (!integration.apiKey || !integration.apiSecret) return null;
    return { keyId: integration.apiKey, keySecret: integration.apiSecret };
  }
  if (integration?.apiKey || integration?.apiSecret) return null;
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = request.app.locals.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return null;
  return { keyId: RAZORPAY_KEY_ID, keySecret: RAZORPAY_KEY_SECRET };
};

const createRazorpayClient = (config) => {
  const Razorpay = require("razorpay");
  return new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
};

router.post("/", async (request, response, next) => {
  try {
    const data = orderSchema.parse(request.body);
    const customer = await User.findById(request.user.id).select("customerType").lean();
    let selectedStore = null;
    if (data.storeId) {
      selectedStore = await StoreLocation.findOne({ _id: data.storeId, active: true }).select("_id").lean();
      if (!selectedStore) return response.status(400).json({ success: false, message: "Select an active store before placing your order." });
    }
    if (customer?.customerType === "B2B" && !selectedStore) {
      return response.status(400).json({ success: false, message: "Select a store for this business order." });
    }
    const subtotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = data.items.reduce((sum, item) => {
      const originalPrice = Number(item.originalPrice) || 0;
      const percentageDiscount = item.price * ((Number(item.discount) || 0) / 100);
      const itemDiscount = originalPrice > item.price ? originalPrice - item.price : percentageDiscount;
      return sum + itemDiscount * item.quantity;
    }, 0);
    const store = await StoreSettings.findOne({ key: "default" }).lean();
    const deliveryFee = Number(store?.deliveryFee ?? 49);
    const freeDeliveryAbove = Number(store?.freeDeliveryAbove ?? 999);
    const delivery = subtotal >= freeDeliveryAbove ? 0 : deliveryFee;
    const promoCode = data.promoCode.toUpperCase();
    let promoDiscount = 0;
    if (promoCode) {
      const offer = await Offer.findOne({ code: promoCode, status: "Active", startsAt: { $lte: new Date() }, endsAt: { $gte: new Date() } }).lean();
      if (!offer) return response.status(400).json({ success: false, message: "This promo code is invalid or expired." });
      if (subtotal < offer.minOrder) return response.status(400).json({ success: false, message: `Add ₹${offer.minOrder - subtotal} more to use this offer.` });
      promoDiscount = calculateOfferDiscount(offer, data.items, subtotal);
      if (offer.offerType !== "discount" && promoDiscount <= 0) return response.status(400).json({ success: false, message: "Add the qualifying products and quantities to use this offer." });
    }
    const isRazorpay = data.paymentMethod === "razorpay";
    const productIds = data.items.map((item) => item.id);
    const products = await Product.find({ _id: { $in: productIds }, status: "Published" }).select("_id name stock costPrice locationStock").lean();
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));
    const availableStockFor = (product) => {
      if (selectedStore && product?.locationStock?.length) {
        return Number(product.locationStock.find((entry) => entry.location.toString() === selectedStore._id.toString())?.quantity) || 0;
      }
      return Number(product?.stock) || 0;
    };
    const unavailableItem = data.items.find((item) => !productMap.has(item.id) || availableStockFor(productMap.get(item.id)) < item.quantity);
    if (unavailableItem) return response.status(409).json({ success: false, message: `${unavailableItem.name} is out of stock or has insufficient stock.` });
    const costPrices = new Map(products.map((product) => [product._id.toString(), Number(product.costPrice) || 0]));
    const razorpayConfig = isRazorpay ? await getRazorpayConfig(request) : null;
    if (isRazorpay && !razorpayConfig) {
      return response.status(503).json({ success: false, message: "Razorpay is not configured on the server." });
    }
    const razorpay = isRazorpay ? createRazorpayClient(razorpayConfig) : null;
    const order = await Order.create({ orderNumber: `EM-${crypto.randomInt(10000, 99999)}`, customer: request.user.id, store: selectedStore?._id, items: data.items.map((item) => { const originalPrice = Number(item.originalPrice) || 0; const percentageDiscount = item.price * ((Number(item.discount) || 0) / 100); const discountAmount = originalPrice > item.price ? originalPrice - item.price : percentageDiscount; return { product: item.id, name: item.name, price: item.price, costPrice: costPrices.get(item.id) || 0, originalPrice, discount: item.discount || 0, discountAmount, quantity: item.quantity, image: item.image }; }), shipping: data.shipping, subtotal, discount, promoCode, promoDiscount, delivery, total: Math.max(0, subtotal + delivery - promoDiscount), paymentMethod: data.paymentMethod, paymentStatus: data.paymentMethod === "cod" || isRazorpay ? "Pending" : "Paid" });
    const stockUpdate = await Product.bulkWrite(data.items.map((item) => {
      const usesLocationStock = Boolean(selectedStore && productMap.get(item.id)?.locationStock?.length);
      const filter = { _id: item.id, stock: { $gte: item.quantity } };
      const update = { stock: -item.quantity };
      if (usesLocationStock) {
        filter.locationStock = { $elemMatch: { location: selectedStore._id, quantity: { $gte: item.quantity } } };
        update["locationStock.$.quantity"] = -item.quantity;
      }
      return { updateOne: { filter, update: { $inc: update } } };
    }));
    if (stockUpdate.modifiedCount !== data.items.length) {
      await Order.findByIdAndDelete(order._id);
      return response.status(409).json({ success: false, message: "Stock changed while placing the order. Please review your cart and try again." });
    }
    if (!isRazorpay) return response.status(201).json({ success: true, data: order });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.total * 100),
      currency: "INR",
      receipt: order.orderNumber,
      notes: { orderId: String(order._id) },
    });
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();
    response.status(201).json({
      success: true,
      data: order,
      razorpay: { keyId: razorpayConfig.keyId, orderId: razorpayOrder.id },
    });
  } catch (error) { next(error); }
});

router.get("/mine", async (request, response, next) => {
  try {
    const orders = await Order.find({ customer: request.user.id }).populate("store", "name city").sort({ createdAt: -1 }).limit(10);
    response.json({ success: true, data: orders });
  } catch (error) { next(error); }
});

router.patch("/:id/cancel", async (request, response, next) => {
  try {
    const cancellation = cancellationSchema.safeParse(request.body);
    if (!cancellation.success) return response.status(400).json({ success: false, message: "A cancellation reason of at least 3 characters is required." });
    const order = await Order.findOne({ _id: request.params.id, customer: request.user.id });
    if (!order) return response.status(404).json({ success: false, message: "Order not found" });
    if (!["Processing"].includes(order.status)) return response.status(400).json({ success: false, message: "Only processing orders can be cancelled." });
    order.status = "Cancelled";
    order.cancelReason = cancellation.data.reason;
    order.cancelledAt = new Date();
    await order.save();
    response.json({ success: true, data: order });
  } catch (error) { next(error); }
});

router.get("/", requireAnyRole("admin", "manager", "user"), async (request, response, next) => {
  try {
    const orders = await Order.find().populate("customer", "name email").populate("store", "name city").sort({ createdAt: -1 });
    response.json({ success: true, data: orders });
  } catch (error) { next(error); }
});

router.get("/:id", requireAnyRole("admin", "manager", "user"), async (request, response, next) => {
  try {
    const order = await Order.findById(request.params.id).populate("customer", "name email customerType businessName").populate("store", "name city address").lean();
    if (!order) return response.status(404).json({ success: false, message: "Order not found." });
    response.json({ success: true, data: order });
  } catch (error) { next(error); }
});

router.post("/:id/payment/verify", async (request, response, next) => {
  try {
    const paymentData = z.object({
      razorpayOrderId: z.string().min(1),
      razorpayPaymentId: z.string().min(1),
      razorpaySignature: z.string().min(1),
    }).parse(request.body);
    const order = await Order.findOne({ _id: request.params.id, customer: request.user.id });
    if (!order || order.paymentMethod !== "razorpay") return response.status(404).json({ success: false, message: "Razorpay order not found." });
    if (order.razorpayOrderId !== paymentData.razorpayOrderId) return response.status(400).json({ success: false, message: "Payment order mismatch." });
    const razorpayConfig = await getRazorpayConfig(request);
    if (!razorpayConfig) return response.status(503).json({ success: false, message: "Razorpay is not configured on the server." });
    const expectedSignature = crypto.createHmac("sha256", razorpayConfig.keySecret).update(`${paymentData.razorpayOrderId}|${paymentData.razorpayPaymentId}`).digest("hex");
    const valid = expectedSignature.length === paymentData.razorpaySignature.length && crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(paymentData.razorpaySignature));
    if (!valid) return response.status(400).json({ success: false, message: "Payment verification failed." });
    order.paymentStatus = "Paid";
    order.paidAt = new Date();
    order.razorpayPaymentId = paymentData.razorpayPaymentId;
    order.razorpaySignature = paymentData.razorpaySignature;
    await order.save();
    response.json({ success: true, data: order });
  } catch (error) { next(error); }
});

router.patch("/:id/payment", requireAnyRole("admin", "manager", "user"), async (request, response, next) => {
  try {
    const paymentData = z.object({
      paymentStatus: z.enum(["Pending", "Paid", "Failed"]),
      utrNumber: z.string().trim().max(100).optional().default(""),
      paymentNotes: z.string().trim().max(500).optional().default(""),
    }).parse(request.body);
    const update = {
      paymentStatus: paymentData.paymentStatus,
      utrNumber: paymentData.utrNumber,
      paymentNotes: paymentData.paymentNotes,
      paidAt: paymentData.paymentStatus === "Paid" ? new Date() : null,
    };
    const order = await Order.findByIdAndUpdate(request.params.id, update, { new: true, runValidators: true }).populate("customer", "name email");
    if (!order) return response.status(404).json({ success: false, message: "Order not found" });
    response.json({ success: true, data: order });
  } catch (error) { next(error); }
});

router.patch("/:id/status", requireAnyRole("admin", "manager", "user"), async (request, response, next) => {
  try {
    const order = await Order.findByIdAndUpdate(request.params.id, { status: request.body.status }, { new: true, runValidators: true });
    if (!order) return response.status(404).json({ success: false, message: "Order not found" });
    response.json({ success: true, data: order });
  } catch (error) { next(error); }
});

module.exports = router;