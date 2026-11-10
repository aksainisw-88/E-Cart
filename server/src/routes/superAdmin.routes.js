const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");

const Subscription = require("../models/Subscription");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const SubscriptionRequest = require("../models/SubscriptionRequest");
const BusinessSegment = require("../models/BusinessSegment");
const SuperAdmin = require("../models/SuperAdmin");
const { requireAuth, requireRole } = require("../middleware/auth");
const { requireSuperAdminDatabase } = require("../config/superAdminDatabase");
const { addBillingPeriod, today } = require("../utils/subscription");

const router = express.Router();
router.use(requireSuperAdminDatabase);

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
const createSubscriptionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  business: z.string().trim().min(2).max(120),
  email: z.string().email(),
  phone: z.string().trim().max(30).default(""),
  amount: z.coerce.number().min(0),
  paid: z.coerce.number().min(0),
  plan: z.string().trim().min(1).max(40).default("Annual"),
}).superRefine((value, context) => {
  if (value.paid > value.amount) {
    context.addIssue({ code: "custom", path: ["paid"], message: "Paid amount cannot exceed the subscription amount." });
  }
});
const renewalSchema = z.object({
  amount: z.coerce.number().min(0),
  paidNow: z.coerce.number().min(0),
}).superRefine((value, context) => {
  if (value.paidNow > value.amount) {
    context.addIssue({ code: "custom", path: ["paidNow"], message: "Payment cannot exceed the renewal amount." });
  }
});
const createPlanSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(""),
  billingInterval: z.enum(["monthly", "yearly"]),
  price: z.coerce.number().min(0),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
});
const updatePlanSchema = createPlanSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "Update at least one plan field.",
});
const createBusinessSegmentSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{1,39}$/),
  description: z.string().trim().max(300).default(""),
  baseProfile: z.enum(["pharmacy", "garments", "footwear", "supermarket", "grocery", "electronics", "beauty", "home_living", "furniture", "jewelry", "toys", "books_stationery", "sports", "pet_supplies", "general"]).default("general"),
  enabled: z.boolean().default(true),
});
const updateBusinessSegmentSchema = createBusinessSegmentSchema.omit({ code: true }).partial().refine((value) => Object.keys(value).length > 0, {
  message: "Update at least one business segment field.",
});

const publicSubscription = (subscription) => {
  const currentDate = today();
  return {
    id: subscription._id.toString(),
    name: subscription.name,
    business: subscription.business,
    email: subscription.email,
    phone: subscription.phone,
    registrationNumber: subscription.registrationNumber,
    registeredAt: subscription.registeredAt,
    activatedAt: subscription.activatedAt,
    validFrom: subscription.validFrom,
    validTill: subscription.validTill,
    amount: subscription.amount,
    paid: subscription.paid,
    paymentStatus: subscription.paymentStatus,
    status: subscription.status === "Active" && subscription.validTill < currentDate ? "Expired" : subscription.status,
    plan: subscription.plan,
    billingInterval: subscription.billingInterval || "yearly",
    history: subscription.history,
  };
};
const publicPlan = (plan) => ({
  id: plan._id.toString(),
  name: plan.name,
  description: plan.description,
  billingInterval: plan.billingInterval,
  price: plan.price,
  active: plan.active,
  featured: plan.featured,
});
const publicBusinessSegment = (segment) => ({
  id: segment._id.toString(),
  segmentId: segment.segmentId,
  name: segment.name,
  code: segment.code,
  description: segment.description,
  baseProfile: segment.baseProfile,
  enabled: segment.enabled,
});
const publicSubscriptionRequest = (purchaseRequest) => ({
  id: purchaseRequest._id.toString(),
  name: purchaseRequest.name,
  business: purchaseRequest.business,
  email: purchaseRequest.email,
  phone: purchaseRequest.phone,
  plan: purchaseRequest.plan,
  planId: purchaseRequest.planId?.toString() || "",
  billingInterval: purchaseRequest.billingInterval || "yearly",
  planPrice: purchaseRequest.planPrice,
  notes: purchaseRequest.notes,
  status: purchaseRequest.status,
  requestedAt: purchaseRequest.requestedAt,
  reviewedAt: purchaseRequest.reviewedAt,
});

const makeLicenseKey = () => {
  const randomPart = () => crypto.randomBytes(3).toString("hex").toUpperCase();
  return `ECAR-${randomPart()}-${randomPart()}-${randomPart()}-${randomPart()}`;
};

const makeCredentials = () => {
  return {
    registrationNumber: `EC-${new Date().getUTCFullYear()}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
    licenseKey: makeLicenseKey(),
  };
};

router.post("/login", async (request, response, next) => {
  try {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: "Enter a valid email and password." });
    const user = await SuperAdmin.findOne({ email: parsed.data.email.toLowerCase() }).select("+password");
    if (!user || !(await bcrypt.compare(parsed.data.password, user.password)) || user.status === "Blocked") {
      return response.status(401).json({ success: false, message: "Invalid email or password." });
    }
    const env = request.app.locals.env;
    const token = jwt.sign({ id: user._id.toString(), role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
    response.cookie("accessToken", token, {
      httpOnly: true,
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      secure: env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return response.json({ success: true, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (request, response) => {
  const env = request.app.locals.env;
  response.clearCookie("accessToken", { httpOnly: true, sameSite: env.NODE_ENV === "production" ? "none" : "lax", secure: env.NODE_ENV === "production" });
  response.json({ success: true });
});

router.get("/me", requireAuth, requireRole("super_admin"), async (request, response, next) => {
  try {
    const user = await SuperAdmin.findById(request.user.id).select("name email role");
    if (!user) return response.status(401).json({ success: false, message: "Super-admin account no longer exists." });
    return response.json({ success: true, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    return next(error);
  }
});

router.use(requireAuth, requireRole("super_admin"));

router.get("/business-segments", async (request, response, next) => {
  try {
    const segments = await BusinessSegment.find().sort({ createdAt: 1 }).lean();
    return response.json({ success: true, data: segments.map(publicBusinessSegment) });
  } catch (error) {
    return next(error);
  }
});

router.post("/business-segments", async (request, response, next) => {
  try {
    const parsed = createBusinessSegmentSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: parsed.error.issues[0]?.message || "Check the business segment details." });
    const segment = await BusinessSegment.create({
      ...parsed.data,
      segmentId: `SEG-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    });
    return response.status(201).json({ success: true, data: publicBusinessSegment(segment) });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ success: false, message: "A segment with this code already exists." });
    return next(error);
  }
});

router.patch("/business-segments/:id", async (request, response, next) => {
  try {
    const parsed = updateBusinessSegmentSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: parsed.error.issues[0]?.message || "Check the business segment details." });
    const segment = await BusinessSegment.findByIdAndUpdate(request.params.id, parsed.data, { new: true, runValidators: true });
    if (!segment) return response.status(404).json({ success: false, message: "Business segment not found." });
    return response.json({ success: true, data: publicBusinessSegment(segment) });
  } catch (error) {
    return next(error);
  }
});

router.get("/plans", async (request, response, next) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ createdAt: -1 }).lean();
    return response.json({ success: true, data: plans.map(publicPlan) });
  } catch (error) {
    return next(error);
  }
});

router.post("/plans", async (request, response, next) => {
  try {
    const parsed = createPlanSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: parsed.error.issues[0]?.message || "Check the plan details." });
    const plan = await SubscriptionPlan.create({
      ...parsed.data,
      nameKey: parsed.data.name.toLowerCase(),
    });
    return response.status(201).json({ success: true, data: publicPlan(plan) });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ success: false, message: "A plan with this name and billing interval already exists." });
    return next(error);
  }
});

router.patch("/plans/:id", async (request, response, next) => {
  try {
    const parsed = updatePlanSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: parsed.error.issues[0]?.message || "Check the plan details." });
    const updates = { ...parsed.data };
    if (updates.name) updates.nameKey = updates.name.toLowerCase();
    const plan = await SubscriptionPlan.findByIdAndUpdate(request.params.id, updates, { new: true, runValidators: true });
    if (!plan) return response.status(404).json({ success: false, message: "Subscription plan not found." });
    return response.json({ success: true, data: publicPlan(plan) });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ success: false, message: "A plan with this name and billing interval already exists." });
    return next(error);
  }
});

router.get("/requests", async (request, response, next) => {
  try {
    const requests = await SubscriptionRequest.find().sort({ createdAt: -1 }).lean();
    return response.json({ success: true, data: requests.map(publicSubscriptionRequest) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/requests/:id/status", async (request, response, next) => {
  try {
    const parsed = z.object({ status: z.literal("Rejected") }).safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: "Requests can only be rejected from this action." });
    const purchaseRequest = await SubscriptionRequest.findOneAndUpdate(
      { _id: request.params.id, status: "Pending" },
      {
        $set: { status: "Rejected", reviewedAt: today(), reviewedBy: request.user.id },
        $unset: { activeRequestEmail: "" },
      },
      { new: true, runValidators: true },
    );
    if (!purchaseRequest) {
      return response.status(409).json({ success: false, message: "This request is no longer pending. Refresh the requests list." });
    }
    return response.json({ success: true, data: publicSubscriptionRequest(purchaseRequest.toObject()), message: "Subscription request rejected." });
  } catch (error) {
    return next(error);
  }
});

router.post("/requests/:id/approve", async (request, response, next) => {
  const parsed = z.object({
    amount: z.coerce.number().min(0),
    paidNow: z.coerce.number().min(0),
  }).superRefine((value, context) => {
    if (value.paidNow > value.amount) {
      context.addIssue({ code: "custom", path: ["paidNow"], message: "Paid amount cannot exceed the subscription amount." });
    }
  }).safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ success: false, message: parsed.error.issues[0]?.message || "Check the subscription amount." });
  }

  let purchaseRequest;
  let subscriptionCreated = false;
  try {
    purchaseRequest = await SubscriptionRequest.findOneAndUpdate(
      { _id: request.params.id, status: "Pending" },
      { $set: { status: "Processing" } },
      { new: true, runValidators: true },
    );
    if (!purchaseRequest) {
      return response.status(409).json({ success: false, message: "This request is no longer pending. Refresh the requests list." });
    }

    if (await Subscription.exists({ email: purchaseRequest.email })) {
      await SubscriptionRequest.updateOne(
        { _id: purchaseRequest._id, status: "Processing" },
        { $set: { status: "Pending" } },
      );
      return response.status(409).json({ success: false, message: "A subscription already exists for this admin email. Renew or manage the existing license instead." });
    }

    const currentDate = today();
    const billingInterval = purchaseRequest.billingInterval || "yearly";
    const validTillDate = addBillingPeriod(currentDate, billingInterval);
    const credentials = makeCredentials();
    const { amount, paidNow } = parsed.data;
    const paymentStatus = paidNow >= amount ? "Paid" : paidNow > 0 ? "Partial" : "Unpaid";
    const subscription = await Subscription.create({
      name: purchaseRequest.name,
      business: purchaseRequest.business,
      email: purchaseRequest.email,
      phone: purchaseRequest.phone,
      plan: purchaseRequest.plan,
      billingInterval,
      amount,
      paid: paidNow,
      ...credentials,
      licenseKeyHash: crypto.createHash("sha256").update(credentials.licenseKey).digest("hex"),
      registeredAt: currentDate,
      activatedAt: currentDate,
      validFrom: currentDate,
      validTill: validTillDate,
      paymentStatus,
      history: [{ date: currentDate, amount: paidNow, type: "Initial license", status: paymentStatus }],
    });
    subscriptionCreated = true;

    await SubscriptionRequest.updateOne(
      { _id: purchaseRequest._id, status: "Processing" },
      {
        $set: { status: "Approved", reviewedAt: currentDate, reviewedBy: request.user.id, subscription: subscription._id },
        $unset: { activeRequestEmail: "" },
      },
    );
    return response.status(201).json({
      success: true,
      data: { ...publicSubscription(subscription), licenseKey: credentials.licenseKey },
      message: "Request approved and subscription issued. Copy the license key now; it will not be shown again.",
    });
  } catch (error) {
    if (purchaseRequest && !subscriptionCreated) {
      await SubscriptionRequest.updateOne(
        { _id: purchaseRequest._id, status: "Processing" },
        { $set: { status: "Pending" } },
      );
    }
    if (error.code === 11000) {
      return response.status(409).json({ success: false, message: "A subscription is already registered for this admin email." });
    }
    return next(error);
  }
});

router.get("/subscriptions", async (request, response, next) => {
  try {
    const subscriptions = await Subscription.find().sort({ createdAt: -1 }).lean();
    return response.json({ success: true, data: subscriptions.map(publicSubscription) });
  } catch (error) {
    return next(error);
  }
});

router.post("/subscriptions", async (request, response, next) => {
  try {
    const parsed = createSubscriptionSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: parsed.error.issues[0]?.message || "Check the client details." });
    const data = parsed.data;
    const email = data.email.toLowerCase();
    if (await Subscription.exists({ email })) {
      return response.status(409).json({ success: false, message: "A subscription is already registered for this admin email." });
    }

    const currentDate = today();
    const validTillDate = addBillingPeriod(currentDate, "yearly");
    const credentials = makeCredentials();
    const paymentStatus = data.paid >= data.amount ? "Paid" : data.paid > 0 ? "Partial" : "Unpaid";
    const subscription = await Subscription.create({
      ...data,
      email,
      ...credentials,
      licenseKeyHash: crypto.createHash("sha256").update(credentials.licenseKey).digest("hex"),
      registeredAt: currentDate,
      activatedAt: currentDate,
      validFrom: currentDate,
      validTill: validTillDate,
      paymentStatus,
      history: [{ date: currentDate, amount: data.paid, type: "Initial license", status: paymentStatus }],
    });
    return response.status(201).json({
      success: true,
      data: { ...publicSubscription(subscription), licenseKey: credentials.licenseKey },
      message: "Subscription created. Copy the license key now; it will not be shown again.",
    });
  } catch (error) {
    if (error.code === 11000) {
      const message = error.keyPattern?.email
        ? "A subscription is already registered for this admin email."
        : "A subscription with this registration number already exists.";
      return response.status(409).json({ success: false, message });
    }
    return next(error);
  }
});

router.patch("/subscriptions/:id/status", async (request, response, next) => {
  try {
    const parsed = z.object({ status: z.enum(["Active", "Suspended"]) }).safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: "Choose Active or Suspended status." });
    const subscription = await Subscription.findByIdAndUpdate(request.params.id, parsed.data, { new: true, runValidators: true });
    if (!subscription) return response.status(404).json({ success: false, message: "Subscription not found." });
    return response.json({ success: true, data: publicSubscription(subscription) });
  } catch (error) {
    return next(error);
  }
});

router.post("/subscriptions/:id/rotate-key", async (request, response, next) => {
  try {
    const licenseKey = makeLicenseKey();
    const subscription = await Subscription.findByIdAndUpdate(
      request.params.id,
      { licenseKeyHash: crypto.createHash("sha256").update(licenseKey).digest("hex") },
      { new: true, runValidators: true },
    );
    if (!subscription) return response.status(404).json({ success: false, message: "Subscription not found." });
    return response.json({
      success: true,
      data: { ...publicSubscription(subscription), licenseKey },
      message: "License key rotated. Copy the new key now; it will not be shown again.",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/subscriptions/:id/renew", async (request, response, next) => {
  try {
    const parsed = renewalSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: parsed.error.issues[0]?.message || "Check the renewal details." });
    const subscription = await Subscription.findById(request.params.id);
    if (!subscription) return response.status(404).json({ success: false, message: "Subscription not found." });

    const currentDate = today();
    const startDate = subscription.validTill >= currentDate ? subscription.validTill : currentDate;
    const billingInterval = subscription.billingInterval || "yearly";
    const validTill = addBillingPeriod(startDate, billingInterval);
    const paymentStatus = parsed.data.paidNow >= parsed.data.amount ? "Paid" : parsed.data.paidNow > 0 ? "Partial" : "Unpaid";
    subscription.validFrom = startDate;
    subscription.validTill = validTill;
    subscription.amount = parsed.data.amount;
    subscription.paid = parsed.data.paidNow;
    subscription.paymentStatus = paymentStatus;
    subscription.status = "Active";
    subscription.history.push({ date: currentDate, amount: parsed.data.paidNow, type: "License renewal", status: paymentStatus });
    await subscription.save();
    return response.json({ success: true, data: publicSubscription(subscription) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
