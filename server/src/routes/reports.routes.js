const express = require("express");
const Order = require("../models/Order");
const User = require("../models/User");

const router = express.Router();

const getDateRange = (request) => {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(now.getDate() - 29);
  const from = request.query.from ? new Date(`${request.query.from}T00:00:00.000Z`) : defaultFrom;
  const to = request.query.to ? new Date(`${request.query.to}T23:59:59.999Z`) : now;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new Error("Invalid report date range.");
  return { from, to };
};

router.get("/", async (request, response, next) => {
  try {
    const { from, to } = getDateRange(request);
    const baseFilter = { createdAt: { $gte: from, $lte: to }, status: { $ne: "Cancelled" } };
    const salesFilter = { ...baseFilter, paymentStatus: "Paid" };
    const [summary, trend, topProducts, repeatCustomers, customerCount] = await Promise.all([
      Order.aggregate([
        { $match: salesFilter },
        { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 }, promoSavings: { $sum: "$promoDiscount" } } },
      ]),
      Order.aggregate([
        { $match: salesFilter },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: salesFilter },
        { $unwind: "$items" },
        { $group: { _id: "$items.product", name: { $first: "$items.name" }, quantity: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } },
        { $sort: { quantity: -1, revenue: -1 } },
        { $limit: 10 },
      ]),
      Order.aggregate([
        { $match: salesFilter },
        { $group: { _id: "$customer", orders: { $sum: 1 }, spent: { $sum: "$total" }, lastOrder: { $max: "$createdAt" } } },
        { $match: { orders: { $gte: 2 } } },
        { $sort: { orders: -1, spent: -1 } },
        { $limit: 10 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "customer" } },
        { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, orders: 1, spent: 1, lastOrder: 1, name: "$customer.name", email: "$customer.email" } },
      ]),
      User.countDocuments({ role: "customer" }),
    ]);

    const profit = await Order.aggregate([
      { $match: salesFilter },
      { $unwind: "$items" },
      { $set: { lineRevenue: { $multiply: ["$items.price", "$items.quantity"] }, lineCost: { $multiply: [{ $cond: [{ $gt: [{ $ifNull: ["$items.costPrice", 0] }, 0] }, "$items.costPrice", { $multiply: ["$items.price", 0.7] }] }, "$items.quantity"] } } },
      { $group: { _id: null, cost: { $sum: "$lineCost" }, profit: { $sum: { $subtract: ["$lineRevenue", "$lineCost"] } } } },
    ]);
    const totals = summary[0] || { revenue: 0, orders: 0, promoSavings: 0 };
    const profitTotals = profit[0] || { cost: 0, profit: 0 };
    response.json({ success: true, data: { from, to, totals: { ...totals, customers: customerCount, cost: profitTotals.cost, profit: profitTotals.profit }, trend, topProducts, repeatCustomers } });
  } catch (error) {
    if (error.message === "Invalid report date range.") return response.status(400).json({ success: false, message: error.message });
    return next(error);
  }
});

module.exports = router;