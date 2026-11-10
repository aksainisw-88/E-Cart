const crypto = require("crypto");
const express = require("express");
const { z } = require("zod");

const Subscription = require("../models/Subscription");
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
