const crypto = require("crypto");
const express = require("express");
const { z } = require("zod");

const Subscription = require("../models/Subscription");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const SubscriptionRequest = require("../models/SubscriptionRequest");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");
const { requireSuperAdminDatabase } = require("../config/superAdminDatabase");
const { getSubscriptionForUser, today } = require("../utils/subscription");

const router = express.Router();
router.use(requireSuperAdminDatabase);
const activationSchema = z.object({
  registrationNumber: z.string().trim().min(5).max(40),
  licenseKey: z.string().trim().min(8).max(80),
});
const purchaseRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  business: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).default(""),
  planId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  plan: z.string().trim().min(1).max(80).default("Annual"),
  notes: z.string().trim().max(500).default(""),
});
const publicPlan = (plan) => ({
  id: plan._id.toString(),
  name: plan.name,
  description: plan.description,
  billingInterval: plan.billingInterval,
  price: plan.price,
  featured: plan.featured,
});
const publicPurchaseRequest = (purchaseRequest) => ({
  id: purchaseRequest._id.toString(),
  name: purchaseRequest.name,
  business: purchaseRequest.business,
  email: purchaseRequest.email,
  phone: purchaseRequest.phone,
  plan: purchaseRequest.plan,
  planId: purchaseRequest.planId?.toString() || "",
  billingInterval: purchaseRequest.billingInterval,
  planPrice: purchaseRequest.planPrice,
  notes: purchaseRequest.notes,
  status: purchaseRequest.status,
  requestedAt: purchaseRequest.requestedAt,
  reviewedAt: purchaseRequest.reviewedAt,
});

router.get("/status", requireAuth, async (request, response, next) => {
  try {
    const user = await User.findById(request.user.id).select("role email subscriptionOwner").lean();
    if (!user || !["admin", "manager", "user"].includes(user.role)) {
      return response.status(403).json({ success: false, message: "An admin account is required to view subscription status." });
    }
    return response.json({ success: true, data: await getSubscriptionForUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get("/plans", requireAuth, requireRole("admin"), async (request, response, next) => {
  try {
    const plans = await SubscriptionPlan.find({ active: true })
      .sort({ featured: -1, price: 1, name: 1 })
      .lean();
    return response.json({ success: true, data: plans.map(publicPlan) });
  } catch (error) {
    return next(error);
  }
});

router.get("/request", requireAuth, requireRole("admin"), async (request, response, next) => {
  try {
    const user = await User.findById(request.user.id).select("name email role status").lean();
    if (!user || user.status === "Blocked") {
      return response.status(403).json({ success: false, message: "An active customer admin account is required." });
    }
    const purchaseRequest = await SubscriptionRequest.findOne({ email: user.email }).sort({ createdAt: -1 }).lean();
    return response.json({ success: true, data: purchaseRequest ? publicPurchaseRequest(purchaseRequest) : null });
  } catch (error) {
    return next(error);
  }
});

router.post("/request", requireAuth, requireRole("admin"), async (request, response, next) => {
  let adminEmail = "";
  try {
    const parsed = purchaseRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({ success: false, message: parsed.error.issues[0]?.message || "Check the purchase request details." });
    }
    const user = await User.findById(request.user.id).select("name email role status").lean();
    if (!user || user.status === "Blocked") {
      return response.status(403).json({ success: false, message: "An active customer admin account is required." });
    }
    adminEmail = user.email;
    if (await Subscription.exists({ email: user.email })) {
      return response.status(409).json({ success: false, message: "A subscription already exists for this admin email. Contact the platform administrator for renewal or license support." });
    }
    let planDetails = {
      plan: parsed.data.plan,
      planId: null,
      billingInterval: "yearly",
      planPrice: null,
    };
    if (parsed.data.planId) {
      const plan = await SubscriptionPlan.findOne({ _id: parsed.data.planId, active: true }).lean();
      if (!plan) {
        return response.status(400).json({ success: false, message: "That subscription plan is no longer available. Refresh the plans and choose an active plan." });
      }
      planDetails = {
        plan: plan.name,
        planId: plan._id,
        billingInterval: plan.billingInterval,
        planPrice: plan.price,
      };
    }
    const pending = await SubscriptionRequest.findOne({ email: user.email, status: { $in: ["Pending", "Processing"] } });
    if (pending) {
      return response.json({ success: true, data: publicPurchaseRequest(pending), message: "Your subscription request is already awaiting review." });
    }
    const purchaseRequest = await SubscriptionRequest.create({
      ...parsed.data,
      ...planDetails,
      email: user.email,
      activeRequestEmail: user.email,
      requestedAt: today(),
    });
    return response.status(201).json({
      success: true,
      data: publicPurchaseRequest(purchaseRequest),
      message: "Subscription request sent. The platform administrator will review it and issue your license.",
    });
  } catch (error) {
    if (error.code === 11000) {
      const pending = await SubscriptionRequest.findOne({ email: adminEmail, status: { $in: ["Pending", "Processing"] } });
      if (pending) return response.json({ success: true, data: publicPurchaseRequest(pending), message: "Your subscription request is already awaiting review." });
    }
    return next(error);
  }
});

router.post("/activate", requireAuth, requireRole("admin"), async (request, response, next) => {
  try {
    const parsed = activationSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: "Enter both your registration number and license key." });
    const user = await User.findById(request.user.id).select("email role status +subscriptionKeyHash");
    if (!user || user.status === "Blocked") {
      return response.status(403).json({ success: false, message: "An active admin account is required to activate a subscription." });
    }

    const registrationNumber = parsed.data.registrationNumber.toUpperCase();
    const subscription = await Subscription.findOne({ registrationNumber, email: user.email }).select("+licenseKeyHash");
    const submittedHash = crypto.createHash("sha256").update(parsed.data.licenseKey.toUpperCase()).digest();
    const storedHash = subscription ? Buffer.from(subscription.licenseKeyHash, "hex") : Buffer.alloc(0);
    const validKey = storedHash.length === submittedHash.length && crypto.timingSafeEqual(storedHash, submittedHash);
    if (!subscription || !validKey) {
      return response.status(403).json({ success: false, message: "Registration number or license key does not match this admin email." });
    }

    const currentDate = today();
    if (subscription.status !== "Active") {
      return response.status(403).json({ success: false, message: "This subscription is suspended. Contact the platform administrator." });
    }
    if (subscription.validFrom > currentDate || subscription.validTill < currentDate) {
      return response.status(403).json({ success: false, message: "This subscription is not currently within its valid dates." });
    }

    user.subscriptionRegistrationNumber = subscription.registrationNumber;
    user.subscriptionKeyHash = subscription.licenseKeyHash;
    await user.save();
    return response.json({
      success: true,
      message: "Subscription verified. Admin access is active.",
      data: await getSubscriptionForUser(user),
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
