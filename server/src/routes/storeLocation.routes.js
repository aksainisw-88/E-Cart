const express = require("express");
const { z } = require("zod");
const Order = require("../models/Order");
const StoreLocation = require("../models/StoreLocation");
const StoreSettings = require("../models/StoreSettings");
const User = require("../models/User");
const { requireAuth, requireRole, requireAnyMenuPermission, requireOptionalAuth } = require("../middleware/auth");

const router = express.Router();
const storeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  email: z.union([z.literal(""), z.string().email()]).optional().default(""),
  address: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^$|^\d{6}$/).optional().default(""),
  active: z.boolean().default(true),
});
const adminOnly = [requireAuth, requireRole("admin"), requireAnyMenuPermission("/admin/stores")];

const ensureDefaultLocation = async () => {
  const existing = await StoreLocation.findOne({ isDefault: true }).lean();
  if (existing) return existing;
  const settings = await StoreSettings.findOne({ key: "default" }).lean();
  const values = {
    isDefault: true,
    name: settings?.name || "My Medical Store",
    description: settings?.tagline || "",
    phone: settings?.phone || "",
    email: settings?.email || "",
    address: settings?.address || "New Delhi, India",
    city: "New Delhi",
    pincode: settings?.deliveryPincode || "",
    active: true,
  };
  return StoreLocation.findOneAndUpdate({ isDefault: true }, { $setOnInsert: values }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
};

router.get("/", requireOptionalAuth, async (request, response, next) => {
  try {
    await ensureDefaultLocation();
    const filter = { active: true };
    if (["user", "manager"].includes(request.user?.role)) {
      const staff = await User.findById(request.user.id).select("role location").lean();
      if (staff?.role === "user" && !staff.location) return response.status(403).json({ success: false, message: "Your staff account is not assigned a store location. Ask an admin to assign one." });
      if (staff?.location) filter._id = staff.location;
    }
    const stores = await StoreLocation.find(filter).select("name description phone email address city pincode active isDefault").sort({ name: 1 }).lean();
    response.json({ success: true, data: stores });
  } catch (error) { next(error); }
});

router.get("/manage", ...adminOnly, async (request, response, next) => {
  try {
    await ensureDefaultLocation();
    const stores = await StoreLocation.find().sort({ isDefault: -1, name: 1 }).lean();
    response.json({ success: true, data: stores });
  } catch (error) { next(error); }
});

router.post("/", ...adminOnly, async (request, response, next) => {
  try {
    const data = storeSchema.parse(request.body);
    const store = await StoreLocation.create(data);
    response.status(201).json({ success: true, data: store });
  } catch (error) { next(error); }
});

router.put("/:id", ...adminOnly, async (request, response, next) => {
  try {
    const data = storeSchema.parse(request.body);
    const store = await StoreLocation.findById(request.params.id);
    if (!store) return response.status(404).json({ success: false, message: "Store not found." });
    if (store.isDefault && !data.active) return response.status(400).json({ success: false, message: "The default store must remain active." });
    if (!data.active && await User.exists({ location: store._id, role: { $in: ["manager", "user"] } })) return response.status(409).json({ success: false, message: "This location is assigned to staff. Reassign them before deactivating it." });
    Object.assign(store, data);
    await store.save();
    response.json({ success: true, data: store });
  } catch (error) { next(error); }
});

router.delete("/:id", ...adminOnly, async (request, response, next) => {
  try {
    const store = await StoreLocation.findById(request.params.id);
    if (!store) return response.status(404).json({ success: false, message: "Store not found." });
    if (store.isDefault) return response.status(400).json({ success: false, message: "The default store cannot be deleted." });
    if (await User.exists({ location: store._id, role: { $in: ["manager", "user"] } })) return response.status(409).json({ success: false, message: "This location is assigned to staff. Reassign them before deleting it." });
    if (await Order.exists({ store: store._id })) return response.status(409).json({ success: false, message: "This store has orders. Deactivate it instead." });
    await store.deleteOne();
    response.json({ success: true, message: "Store deleted." });
  } catch (error) { next(error); }
});

module.exports = router;
