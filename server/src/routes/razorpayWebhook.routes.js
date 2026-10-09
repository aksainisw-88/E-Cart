const crypto = require("crypto");
const express = require("express");
const Order = require("../models/Order");
const StoreSettings = require("../models/StoreSettings");

const router = express.Router();

router.post("/", async (request, response, next) => {
  try {
    const signature = request.get("x-razorpay-signature") || "";
    const rawBody = request.rawBody;
    if (!rawBody || !/^[a-f\d]{64}$/i.test(signature)) {
      return response.status(400).json({ success: false, message: "Invalid Razorpay webhook signature." });
    }

    const settings = await StoreSettings.findOne({ key: "default" }).select("paymentIntegrations").lean();
    const secret = settings?.paymentIntegrations?.razorpay?.webhookSecret || request.app.locals.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return response.status(503).json({ success: false, message: "Razorpay webhook secret is not configured." });

    const expectedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const suppliedBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    if (suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) {
      return response.status(400).json({ success: false, message: "Invalid Razorpay webhook signature." });
    }

    if (request.body.event !== "payment.captured") return response.json({ success: true, received: true });

    const payment = request.body.payload?.payment?.entity;
    if (!payment?.order_id || !payment.id || payment.currency !== "INR" || !Number.isFinite(payment.amount)) {
      return response.status(400).json({ success: false, message: "Invalid captured payment payload." });
    }

    const order = await Order.findOne({ razorpayOrderId: payment.order_id, paymentMethod: "razorpay" });
    if (!order) return response.status(404).json({ success: false, message: "Matching order not found." });
    if (payment.amount !== Math.round(order.total * 100)) {
      return response.status(400).json({ success: false, message: "Payment amount does not match the order." });
    }

    await Order.updateOne(
      { _id: order._id, paymentStatus: { $ne: "Paid" } },
      { $set: { paymentStatus: "Paid", paidAt: new Date(), razorpayPaymentId: payment.id, paymentNotes: "Confirmed via Razorpay webhook" } },
    );
    response.json({ success: true, received: true });
  } catch (error) { next(error); }
});

module.exports = router;