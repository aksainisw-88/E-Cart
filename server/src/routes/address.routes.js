const express = require("express");
const { z } = require("zod");
const User = require("../models/User");

const router = express.Router();
const addressSchema = z.object({
  label: z.string().trim().min(2).max(40).default("Home"),
  name: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^\d{10}$/),
  address: z.string().trim().min(3).max(240),
  city: z.string().trim().min(2).max(80),
  pincode: z.string().regex(/^\d{6}$/),
  isDefault: z.boolean().default(false),
});

router.get("/", async (request, response, next) => {
  try {
    const user = await User.findById(request.user.id).select("addresses").lean();
    response.json({ success: true, data: user?.addresses || [] });
  } catch (error) { next(error); }
});

router.post("/", async (request, response, next) => {
  try {
    const data = addressSchema.parse(request.body);
    const user = await User.findById(request.user.id);
    if (!user) return response.status(404).json({ success: false, message: "Account not found." });
    user.addresses.forEach((address) => { address.isDefault = data.isDefault ? false : address.isDefault; });
    if (!user.addresses.length) data.isDefault = true;
    user.addresses.push(data);
    await user.save();
    response.status(201).json({ success: true, data: user.addresses });
  } catch (error) { next(error); }
});

router.put("/:id", async (request, response, next) => {
  try {
    const data = addressSchema.parse(request.body);
    const user = await User.findById(request.user.id);
    const address = user?.addresses.id(request.params.id);
    if (!address) return response.status(404).json({ success: false, message: "Address not found." });
    user.addresses.forEach((item) => { item.isDefault = data.isDefault ? false : item.isDefault; });
    Object.assign(address, data);
    await user.save();
    response.json({ success: true, data: user.addresses });
  } catch (error) { next(error); }
});

router.delete("/:id", async (request, response, next) => {
  try {
    const user = await User.findById(request.user.id);
    if (!user?.addresses.id(request.params.id)) return response.status(404).json({ success: false, message: "Address not found." });
    user.addresses.pull(request.params.id);
    if (user.addresses.length && !user.addresses.some((address) => address.isDefault)) user.addresses[0].isDefault = true;
    await user.save();
    response.json({ success: true, data: user.addresses });
  } catch (error) { next(error); }
});

module.exports = router;
