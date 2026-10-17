const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const express = require("express");
const fs = require("fs/promises");
const mongoose = require("mongoose");
const path = require("path");
const { z } = require("zod");
const User = require("../models/User");
const Product = require("../models/Product");
const ProductCategory = require("../models/ProductCategory");
const Order = require("../models/Order");
const PosSale = require("../models/PosSale");
const Purchase = require("../models/Purchase");
const PurchaseAdjustment = require("../models/PurchaseAdjustment");
const Vendor = require("../models/Vendor");
const VendorPayment = require("../models/VendorPayment");
const Offer = require("../models/Offer");
const StoreLocation = require("../models/StoreLocation");
const StoreSettings = require("../models/StoreSettings");
const SupportTicket = require("../models/SupportTicket");
const SignupOtp = require("../models/SignupOtp");
const PasswordReset = require("../models/PasswordReset");
const InventoryResetOtp = require("../models/InventoryResetOtp");
const StoreResetOtp = require("../models/StoreResetOtp");
const { sendInventoryResetCode, sendStoreResetCode } = require("../utils/email");

const router = express.Router();
const menuPermissionSchema = z.array(z.enum([
  "/admin",
  "/admin/reports",
  "/admin/products",
  "/admin/categories",
  "/admin/users",
  "/admin/customers",
  "/admin/orders",
  "/admin/pos",
  "/admin/purchase-entry",
  "/admin/vendors",
  "/admin/payments",
  "/admin/store",
  "/admin/testimonials",
  "/admin/hero-slider",
  "/admin/store/delivery",
  "/admin/offers",
  "/admin/support",
  "/admin/settings",
  "/admin/stores",
])).max(19);
const adminOnlyMenus = ["/admin", "/admin/users", "/admin/store", "/admin/stores", "/admin/testimonials", "/admin/hero-slider", "/admin/store/delivery", "/admin/offers", "/admin/support", "/admin/settings"];
const withRoleMenuValidation = (schema) => schema.superRefine((data, context) => {
  if (data.role === "admin") return;
  data.menuPermissions.forEach((permission, index) => {
    if (adminOnlyMenus.includes(permission)) {
      context.addIssue({ code: "custom", path: ["menuPermissions", index], message: "This menu is only available to admin users." });
    }
  });
});
const userSchema = withRoleMenuValidation(z.object({ name: z.string().trim().min(2).max(80), email: z.string().email(), password: z.string().min(8).max(128), role: z.enum(["admin", "manager", "user"]), menuPermissions: menuPermissionSchema }));
const editSchema = withRoleMenuValidation(z.object({ name: z.string().trim().min(2).max(80), email: z.string().email(), role: z.enum(["admin", "manager", "user"]), menuPermissions: menuPermissionSchema }));
const inventoryResetConfirmSchema = z.object({ otp: z.string().regex(/^\d{6}$/) });
const storeResetConfirmSchema = z.object({ otp: z.string().regex(/^\d{6}$/) });
const hashInventoryResetOtp = (userId, otp, secret) => crypto.createHmac("sha256", secret).update(`${userId}:${otp}`).digest("hex");
const hashStoreResetOtp = (userId, otp, secret) => crypto.createHmac("sha256", secret).update(`store:${userId}:${otp}`).digest("hex");
const maskEmail = (email) => {
  const [name, domain] = String(email || "").split("@");
  return name && domain ? `${name.slice(0, 1)}${"*".repeat(Math.max(2, name.length - 1))}@${domain}` : "your admin email";
};
const clearUploadDirectory = async (directory) => {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? fs.rm(target, { recursive: true, force: true }) : fs.unlink(target);
  }));
};

router.post("/inventory-reset/otp", async (request, response, next) => {
  try {
    const admin = await User.findOne({ _id: request.user.id, role: "admin" }).select("email status");
    if (!admin?.email || admin.status === "Blocked") return response.status(403).json({ success: false, message: "An active admin account is required to reset inventory." });
    const existing = await InventoryResetOtp.findOne({ user: admin._id }).select("createdAt").lean();
    if (existing && Date.now() - new Date(existing.createdAt).getTime() < 60_000) {
      return response.status(429).json({ success: false, message: "Wait one minute before requesting another reset code." });
    }
    const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const env = request.app.locals.env;
    const sent = await sendInventoryResetCode(admin.email, otp, env);
    await InventoryResetOtp.findOneAndUpdate(
      { user: admin._id },
      { otpHash: hashInventoryResetOtp(admin._id, otp, env.JWT_SECRET), attempts: 0, expiresAt: new Date(Date.now() + 10 * 60_000) },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    response.json({ success: true, message: `Reset code sent to ${maskEmail(admin.email)}. It expires in 10 minutes.`, ...(!sent ? { developmentOtp: otp } : {}) });
  } catch (error) {
    if (error.message === "Email delivery is not configured.") return response.status(503).json({ success: false, message: "Admin email delivery is not configured." });
    next(error);
  }
});

router.post("/inventory-reset/confirm", async (request, response, next) => {
  try {
    const parsed = inventoryResetConfirmSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: "Enter the 6-digit reset code." });
    const admin = await User.findOne({ _id: request.user.id, role: "admin" }).select("_id status");
    if (!admin || admin.status === "Blocked") return response.status(403).json({ success: false, message: "An active admin account is required to reset inventory." });
    const challenge = await InventoryResetOtp.findOne({ user: admin._id, expiresAt: { $gt: new Date() } });
    if (!challenge) return response.status(400).json({ success: false, message: "Reset code is invalid or expired. Request a new code." });
    if (challenge.attempts >= 5) {
      await challenge.deleteOne();
      return response.status(429).json({ success: false, message: "Too many incorrect codes. Request a new code." });
    }
    const expected = Buffer.from(challenge.otpHash, "hex");
    const submitted = Buffer.from(hashInventoryResetOtp(admin._id, parsed.data.otp, request.app.locals.env.JWT_SECRET), "hex");
    if (submitted.length !== expected.length || !crypto.timingSafeEqual(submitted, expected)) {
      challenge.attempts += 1;
      await challenge.save();
      if (challenge.attempts >= 5) await challenge.deleteOne();
      return response.status(400).json({ success: false, message: "The reset code is incorrect." });
    }

    const session = await mongoose.startSession();
    let resultCounts;
    try {
      await session.withTransaction(async () => {
        const currentChallenge = await InventoryResetOtp.findOne({ _id: challenge._id, user: admin._id, expiresAt: { $gt: new Date() } }).session(session);
        if (!currentChallenge || currentChallenge.otpHash !== challenge.otpHash) {
          throw Object.assign(new Error("Reset code was already used or expired. Request a new code."), { statusCode: 400 });
        }
        await InventoryResetOtp.deleteOne({ _id: currentChallenge._id }, { session });
        const [products, batches] = await Promise.all([
          Product.updateMany({}, [{ $set: {
            stock: 0,
            locationStock: { $map: { input: { $ifNull: ["$locationStock", []] }, as: "location", in: { $mergeObjects: ["$$location", { quantity: 0 }] } } },
            variants: { $map: { input: { $ifNull: ["$variants", []] }, as: "variant", in: { $mergeObjects: ["$$variant", { locationStock: { $map: { input: { $ifNull: ["$$variant.locationStock", []] }, as: "stock", in: { $mergeObjects: ["$$stock", { quantity: 0 }] } } } }] } } },
          } }], { session }),
          Purchase.updateMany({ remainingQuantity: { $ne: 0 } }, { $set: { remainingQuantity: 0 } }, { session }),
        ]);
        resultCounts = { products: products.matchedCount, batches: batches.modifiedCount };
      });
    } catch (error) {
      const transactionUnsupported = error.code === 20 || error.codeName === "IllegalOperation" || /transactions are not supported|replica set/i.test(error.message || "");
      if (transactionUnsupported) return response.status(503).json({ success: false, message: "Inventory reset requires MongoDB transaction support. Configure MongoDB as a replica set and try again." });
      if (error.statusCode) return response.status(error.statusCode).json({ success: false, message: error.message });
      return next(error);
    } finally {
      await session.endSession();
    }
    response.json({ success: true, message: "Inventory quantities were reset to zero. Store records and transaction history were preserved.", data: resultCounts });
  } catch (error) { next(error); }
});

router.post("/store-reset/otp", async (request, response, next) => {
  try {
    const admin = await User.findOne({ _id: request.user.id, role: "admin" }).select("email status");
    if (!admin?.email || admin.status === "Blocked") return response.status(403).json({ success: false, message: "An active admin account is required to reset store data." });
    const existing = await StoreResetOtp.findOne({ user: admin._id }).select("createdAt").lean();
    if (existing && Date.now() - new Date(existing.createdAt).getTime() < 60_000) {
      return response.status(429).json({ success: false, message: "Wait one minute before requesting another store reset code." });
    }
    const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const sent = await sendStoreResetCode(admin.email, otp, request.app.locals.env);
    await StoreResetOtp.findOneAndUpdate(
      { user: admin._id },
      { otpHash: hashStoreResetOtp(admin._id, otp, request.app.locals.env.JWT_SECRET), attempts: 0, expiresAt: new Date(Date.now() + 10 * 60_000) },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    response.json({ success: true, message: `Store reset code sent to ${maskEmail(admin.email)}. It expires in 10 minutes.`, ...(!sent ? { developmentOtp: otp } : {}) });
  } catch (error) {
    if (error.message === "Email delivery is not configured.") return response.status(503).json({ success: false, message: "Admin email delivery is not configured." });
    next(error);
  }
});

router.get("/", async (request, response, next) => {
  try {
    const users = await User.find({ role: { $in: ["admin", "manager", "user"] } }).select("name email role status menuPermissions createdAt updatedAt").sort({ createdAt: -1 });
    response.json({ success: true, data: users });
  } catch (error) { next(error); }
});

router.post("/", async (request, response, next) => {
  try {
    const data = userSchema.parse(request.body);
    const email = data.email.toLowerCase();
    if (await User.exists({ email })) return response.status(409).json({ success: false, message: "A user with this email already exists." });
    const user = await User.create({ name: data.name, email, password: await bcrypt.hash(data.password, 12), role: data.role, menuPermissions: data.menuPermissions });
    response.status(201).json({ success: true, data: { _id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, menuPermissions: user.menuPermissions } });
  } catch (error) { next(error); }
});

router.put("/:id", async (request, response, next) => {
  try {
    const data = editSchema.parse(request.body);
    const user = await User.findOneAndUpdate({ _id: request.params.id, role: { $in: ["admin", "manager", "user"] } }, data, { new: true, runValidators: true }).select("name email role status menuPermissions createdAt updatedAt");
    if (!user) return response.status(404).json({ success: false, message: "Admin user not found" });
    response.json({ success: true, data: user });
  } catch (error) { next(error); }
});

router.patch("/:id/status", async (request, response, next) => {
  try {
    const user = await User.findOneAndUpdate({ _id: request.params.id, role: { $in: ["admin", "manager", "user"] } }, { status: request.body.status }, { new: true, runValidators: true }).select("name email role status");
    if (!user) return response.status(404).json({ success: false, message: "Admin user not found" });
    response.json({ success: true, data: user });
  } catch (error) { next(error); }
});

router.delete("/:id", async (request, response, next) => {
  try {
    if (request.params.id === request.user.id) return response.status(400).json({ success: false, message: "You cannot delete your own admin account." });
    const user = await User.findOneAndDelete({ _id: request.params.id, role: { $in: ["admin", "manager", "user"] } });
    if (!user) return response.status(404).json({ success: false, message: "Admin user not found" });
    response.json({ success: true, message: "Admin user deleted" });
  } catch (error) { next(error); }
});

module.exports = router;