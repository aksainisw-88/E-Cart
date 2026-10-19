const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const express = require("express");
const { z } = require("zod");
const User = require("../models/User");
const Order = require("../models/Order");
const PosSale = require("../models/PosSale");

const router = express.Router();
const customerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.union([z.string().trim().email(), z.literal("")]).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  address: z.string().trim().max(300).optional().default(""),
  locality: z.string().trim().max(120).optional().default(""),
  pincode: z.string().trim().regex(/^(?:\d{6})?$/).optional().default(""),
  district: z.string().trim().max(120).optional().default(""),
  state: z.string().trim().max(120).optional().default(""),
  gstin: z.string().trim().max(15).transform((value) => value.toUpperCase()).optional().default(""),
  panNumber: z.string().trim().max(10).transform((value) => value.toUpperCase()).refine((value) => !value || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value), "Enter a valid PAN number.").optional().default(""),
  gender: z.enum(["", "Male", "Female", "Other", "Prefer not to say"]).optional().default(""),
});

router.get("/", async (request, response, next) => {
  try {
    const customers = await User.find({ role: "customer" }).select("name email phone address locality pincode district state gstin panNumber gender status customerSource createdAt addresses").sort({ createdAt: -1 }).lean();
    const locationId = request.user.locationId || "";
    const [orders, posSales] = await Promise.all([
      Order.aggregate([{ $match: locationId ? { store: locationId } : {} }, { $group: { _id: "$customer", count: { $sum: 1 }, total: { $sum: "$total" } } }]),
      PosSale.aggregate([{ $match: { ...(locationId ? { location: locationId } : {}), customer: { $exists: true } } }, { $group: { _id: "$customer", count: { $sum: 1 }, total: { $sum: "$total" } } }]),
    ]);
    const summary = new Map();
    [...orders, ...posSales].forEach((item) => {
      const key = item._id.toString();
      const current = summary.get(key) || { count: 0, total: 0 };
      summary.set(key, { count: current.count + item.count, total: current.total + item.total });
    });
    response.json({ success: true, data: customers.map((customer) => {
      const { addresses, ...customerData } = customer;
      const defaultAddress = addresses?.find((address) => address.isDefault) || addresses?.[0];
      return {
        ...customerData,
        phone: customer.phone || defaultAddress?.phone || "",
        address: customer.address || defaultAddress?.address || "",
        locality: customer.locality || defaultAddress?.city || "",
        pincode: customer.pincode || defaultAddress?.pincode || "",
        customerSource: customer.customerSource || "Online",
        orderCount: summary.get(customer._id.toString())?.count || 0,
        totalSpent: summary.get(customer._id.toString())?.total || 0,
      };
    }) });
  } catch (error) { next(error); }
});

router.post("/", async (request, response, next) => {
  try {
    const parsed = customerSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: "Enter a valid customer name, email, and phone." });
    const { name, email, phone, address, locality, pincode, district, state, gstin, panNumber, gender } = parsed.data;
    const customerEmail = email.toLowerCase() || `offline-${crypto.randomUUID()}@customers.invalid`;
    if (await User.exists({ email: customerEmail })) return response.status(409).json({ success: false, message: "A customer with this email already exists." });
    const password = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
    const customer = await User.create({ name, email: customerEmail, phone, address, locality, pincode, district, state, gstin, panNumber, gender, password, role: "customer", customerSource: "Offline" });
    response.status(201).json({ success: true, data: { _id: customer._id, name: customer.name, email: email ? customer.email : "", phone: customer.phone, address: customer.address, locality: customer.locality, pincode: customer.pincode, district: customer.district, state: customer.state, gstin: customer.gstin, panNumber: customer.panNumber, gender: customer.gender, status: customer.status, customerSource: customer.customerSource, createdAt: customer.createdAt, orderCount: 0, totalSpent: 0 } });
  } catch (error) { next(error); }
});

router.put("/:id", async (request, response, next) => {
  try {
    const parsed = customerSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: "Enter a valid customer name, email, and phone." });
    const { name, email, phone, address, locality, pincode, district, state, gstin, panNumber, gender } = parsed.data;
    const customer = await User.findOne({ _id: request.params.id, role: "customer" });
    if (!customer) return response.status(404).json({ success: false, message: "Customer not found." });
    if (email) {
      const normalizedEmail = email.toLowerCase();
      const duplicate = await User.exists({ _id: { $ne: customer._id }, email: normalizedEmail });
      if (duplicate) return response.status(409).json({ success: false, message: "A customer with this email already exists." });
      customer.email = normalizedEmail;
    }
    customer.name = name;
    customer.phone = phone;
    customer.address = address;
    customer.locality = locality;
    customer.pincode = pincode;
    customer.district = district;
    customer.state = state;
    customer.gstin = gstin;
    customer.panNumber = panNumber;
    customer.gender = gender;
    await customer.save();
    response.json({ success: true, data: { _id: customer._id, name: customer.name, email: customer.email.includes("@customers.invalid") ? "" : customer.email, phone: customer.phone, address: customer.address, locality: customer.locality, pincode: customer.pincode, district: customer.district, state: customer.state, gstin: customer.gstin, panNumber: customer.panNumber, gender: customer.gender, status: customer.status, customerSource: customer.customerSource } });
  } catch (error) { next(error); }
});

router.delete("/:id", async (request, response, next) => {
  try {
    const customer = await User.findOne({ _id: request.params.id, role: "customer" }).select("_id");
    if (!customer) return response.status(404).json({ success: false, message: "Customer not found." });
    const [hasOrders, hasPosSales] = await Promise.all([
      Order.exists({ customer: customer._id }),
      PosSale.exists({ customer: customer._id }),
    ]);
    if (hasOrders || hasPosSales) return response.status(409).json({ success: false, message: "This customer has transaction history. Block the account instead of deleting it." });
    await customer.deleteOne();
    response.json({ success: true, message: "Customer deleted." });
  } catch (error) { next(error); }
});

router.patch("/:id/status", async (request, response, next) => {
  try {
    const parsed = z.object({ status: z.enum(["Active", "Blocked"]) }).safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: "Choose Active or Blocked status." });
    const customer = await User.findOneAndUpdate({ _id: request.params.id, role: "customer" }, { status: parsed.data.status }, { new: true, runValidators: true }).select("name email phone status customerSource");
    if (!customer) return response.status(404).json({ success: false, message: "Customer not found" });
    response.json({ success: true, data: customer });
  } catch (error) { next(error); }
});

module.exports = router;
