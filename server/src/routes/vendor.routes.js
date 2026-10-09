const express = require("express");
const { z } = require("zod");
const Vendor = require("../models/Vendor");
const VendorPayment = require("../models/VendorPayment");
const Purchase = require("../models/Purchase");

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

router.get("/", async (request, response, next) => {
  try {
    const vendors = await Vendor.find().sort({ name: 1 });
    response.json({ success: true, data: vendors });
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
    const payments = await VendorPayment.find({ vendor: request.params.id }).sort({ paymentDate: -1, createdAt: -1 });
    response.json({ success: true, data: payments });
  } catch (error) { next(error); }
});

router.post("/:id/payments", async (request, response, next) => {
  try {
    const data = paymentSchema.parse(request.body);
    const vendor = await Vendor.findById(request.params.id);
    if (!vendor) return response.status(404).json({ success: false, message: "Vendor not found" });
    if (data.amount > vendor.pendingAmount) return response.status(400).json({ success: false, message: "Payment cannot exceed the vendor pending amount." });
    let purchase = null;
    if (data.purchase) {
      purchase = await Purchase.findOne({ _id: data.purchase, vendor: vendor._id });
      if (!purchase) return response.status(404).json({ success: false, message: "Purchase invoice not found for this vendor." });
      const invoiceBalance = Math.max(0, purchase.total - purchase.paidAmount);
      if (data.amount > invoiceBalance) return response.status(400).json({ success: false, message: "Payment cannot exceed the selected invoice balance." });
    }
    const payment = await VendorPayment.create({ ...data, purchase: purchase?._id, vendor: vendor._id });
    vendor.pendingAmount = Math.max(0, vendor.pendingAmount - data.amount);
    if (purchase) {
      purchase.paidAmount += data.amount;
      purchase.paymentStatus = purchase.paidAmount >= purchase.total ? "Paid" : "Partially paid";
      await purchase.save();
    }
    await vendor.save();
    response.status(201).json({ success: true, data: payment, vendor });
  } catch (error) { next(error); }
});

module.exports = router;
