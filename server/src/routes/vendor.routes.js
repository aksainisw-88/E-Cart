const express = require("express");
const { z } = require("zod");
const Vendor = require("../models/Vendor");
const VendorPayment = require("../models/VendorPayment");
const Purchase = require("../models/Purchase");
const StoreLocation = require("../models/StoreLocation");
const PurchaseAdjustment = require("../models/PurchaseAdjustment");

const router = express.Router();
const vendorSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().default(""),
  email: z.string().trim().email().optional().or(z.literal("")).default(""),
  address: z.string().trim().max(300).optional().default(""),
});
const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  purchase: z.string().optional().or(z.literal("")),
  paymentMode: z.enum(["Cash", "UPI", "Card", "Bank transfer", "Cheque"]).default("Cash"),
  paymentDate: z.coerce.date(),
  notes: z.string().trim().max(300).optional().default(""),
});
const assignedLocationFor = async (request) => {
  if (!request.user.locationId) return null;
  const location = await StoreLocation.findOne({ _id: request.user.locationId, active: true }).select("_id isDefault").lean();
  if (!location) throw Object.assign(new Error("Your assigned store location is no longer available."), { statusCode: 403 });
  return location;
};
const locationPurchaseFilter = (location) => location?.isDefault
  ? { $or: [{ location: location._id }, { location: null }] }
  : location ? { location: location._id } : {};

router.get("/", async (request, response, next) => {
  try {
    const vendors = await Vendor.find().sort({ name: 1 });
    const location = await assignedLocationFor(request);
    if (!location) return response.json({ success: true, data: vendors, locationRestricted: false });
    const [purchases, adjustments] = await Promise.all([
      Purchase.find(locationPurchaseFilter(location)).select("vendor total paidAmount").lean(),
      PurchaseAdjustment.find({ location: location._id, vendor: { $ne: null } }).select("vendor balanceAdjustment").lean(),
    ]);
    const balances = new Map();
    purchases.forEach((purchase) => {
      const id = purchase.vendor.toString();
      balances.set(id, (balances.get(id) || 0) + Math.max(0, Number(purchase.total || 0) - Number(purchase.paidAmount || 0)));
    });
    adjustments.forEach((adjustment) => {
      const id = adjustment.vendor.toString();
      balances.set(id, (balances.get(id) || 0) + (Number(adjustment.balanceAdjustment) || 0));
    });
    response.json({ success: true, data: vendors.map((vendor) => ({ ...vendor.toObject(), pendingAmount: Math.max(0, balances.get(vendor._id.toString()) || 0) })), locationRestricted: true });
  } catch (error) { next(error); }
});

router.post("/", async (request, response, next) => {
  try {
    const vendor = await Vendor.create(vendorSchema.parse(request.body));
    response.status(201).json({ success: true, data: vendor });
  } catch (error) { next(error); }
});

router.put("/:id", async (request, response, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(request.params.id, vendorSchema.parse(request.body), { new: true, runValidators: true });
    if (!vendor) return response.status(404).json({ success: false, message: "Vendor not found" });
    response.json({ success: true, data: vendor });
  } catch (error) { next(error); }
});

router.delete("/:id", async (request, response, next) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(request.params.id);
    if (!vendor) return response.status(404).json({ success: false, message: "Vendor not found" });
    response.json({ success: true, message: "Vendor deleted" });
  } catch (error) { next(error); }
});

router.get("/:id/payments", async (request, response, next) => {
  try {
    const location = await assignedLocationFor(request);
    const filter = { vendor: request.params.id };
    if (location) {
      const purchases = await Purchase.find({ vendor: request.params.id, ...locationPurchaseFilter(location) }).select("_id").lean();
      filter.purchase = { $in: purchases.map((purchase) => purchase._id) };
    }
    const payments = await VendorPayment.find(filter).sort({ paymentDate: -1, createdAt: -1 });
    response.json({ success: true, data: payments });
  } catch (error) { next(error); }
});

router.post("/:id/payments", async (request, response, next) => {
  try {
    const data = paymentSchema.parse(request.body);
    const location = await assignedLocationFor(request);
    if (location && !data.purchase) return response.status(400).json({ success: false, message: "Select a purchase invoice at your assigned location for this payment." });
    const vendor = await Vendor.findById(request.params.id);
    if (!vendor) return response.status(404).json({ success: false, message: "Vendor not found" });
    let scopedPendingAmount = Number(vendor.pendingAmount) || 0;
    if (location) {
      const [purchases, adjustments] = await Promise.all([
        Purchase.find({ vendor: vendor._id, ...locationPurchaseFilter(location) }).select("total paidAmount").lean(),
        PurchaseAdjustment.find({ vendor: vendor._id, location: location._id }).select("balanceAdjustment").lean(),
      ]);
      scopedPendingAmount = purchases.reduce((sum, purchase) => sum + Math.max(0, Number(purchase.total || 0) - Number(purchase.paidAmount || 0)), 0)
        + adjustments.reduce((sum, adjustment) => sum + (Number(adjustment.balanceAdjustment) || 0), 0);
    }
    if (!location && data.amount > vendor.pendingAmount) return response.status(400).json({ success: false, message: "Payment cannot exceed the vendor pending amount." });
    let purchase = null;
    if (data.purchase) {
      purchase = await Purchase.findOne({ _id: data.purchase, vendor: vendor._id, ...(location ? locationPurchaseFilter(location) : {}) });
      if (!purchase) return response.status(404).json({ success: false, message: "Purchase invoice not found for this vendor." });
      const invoiceBalance = Math.max(0, purchase.total - purchase.paidAmount);
      if (data.amount > invoiceBalance) return response.status(400).json({ success: false, message: "Payment cannot exceed the selected invoice balance." });
    }
    if (location && !purchase) return response.status(404).json({ success: false, message: "Purchase invoice not found at your assigned location." });
    const payment = await VendorPayment.create({ ...data, purchase: purchase?._id, vendor: vendor._id });
    vendor.pendingAmount = Math.max(0, vendor.pendingAmount - data.amount);
    if (purchase) {
      purchase.paidAmount += data.amount;
      purchase.paymentStatus = purchase.paidAmount >= purchase.total ? "Paid" : "Partially paid";
      await purchase.save();
    }
    await vendor.save();
    response.status(201).json({ success: true, data: payment, vendor: { ...vendor.toObject(), pendingAmount: location ? Math.max(0, scopedPendingAmount - data.amount) : vendor.pendingAmount } });
  } catch (error) { next(error); }
});

module.exports = router;
