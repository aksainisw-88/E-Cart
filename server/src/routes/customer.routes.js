const express = require("express");
const User = require("../models/User");
const Order = require("../models/Order");

const router = express.Router();

router.get("/", async (request, response, next) => {
  try {
    const customers = await User.find({ role: "customer" }).select("name email status createdAt").sort({ createdAt: -1 }).lean();
    const orders = await Order.aggregate([{ $group: { _id: "$customer", count: { $sum: 1 }, total: { $sum: "$total" } } }]);
    const summary = new Map(orders.map((item) => [item._id.toString(), item]));
    response.json({ success: true, data: customers.map((customer) => ({ ...customer, orderCount: summary.get(customer._id.toString())?.count || 0, totalSpent: summary.get(customer._id.toString())?.total || 0 })) });
  } catch (error) { next(error); }
});

router.patch("/:id/status", async (request, response, next) => {
  try {
    const customer = await User.findOneAndUpdate({ _id: request.params.id, role: "customer" }, { status: request.body.status }, { new: true, runValidators: true }).select("name email status");
    if (!customer) return response.status(404).json({ success: false, message: "Customer not found" });
    response.json({ success: true, data: customer });
  } catch (error) { next(error); }
});

module.exports = router;