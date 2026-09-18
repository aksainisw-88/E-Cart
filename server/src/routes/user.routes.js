const bcrypt = require("bcryptjs");
const express = require("express");
const { z } = require("zod");
const User = require("../models/User");

const router = express.Router();
const userSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().email(), password: z.string().min(8).max(128), role: z.enum(["admin", "manager", "user"]) });
const editSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().email(), role: z.enum(["admin", "manager", "user"]) });

router.get("/", async (request, response, next) => {
  try {
    const users = await User.find({ role: { $in: ["admin", "manager", "user"] } }).select("name email role status createdAt updatedAt").sort({ createdAt: -1 });
    response.json({ success: true, data: users });
  } catch (error) { next(error); }
});

router.post("/", async (request, response, next) => {
  try {
    const data = userSchema.parse(request.body);
    const email = data.email.toLowerCase();
    if (await User.exists({ email })) return response.status(409).json({ success: false, message: "A user with this email already exists." });
    const user = await User.create({ name: data.name, email, password: await bcrypt.hash(data.password, 12), role: data.role });
    response.status(201).json({ success: true, data: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status } });
  } catch (error) { next(error); }
});

router.put("/:id", async (request, response, next) => {
  try {
    const data = editSchema.parse(request.body);
    const user = await User.findOneAndUpdate({ _id: request.params.id, role: { $in: ["admin", "manager", "user"] } }, data, { new: true, runValidators: true }).select("name email role status createdAt updatedAt");
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