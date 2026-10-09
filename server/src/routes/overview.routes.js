const express = require("express");
const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");

const router = express.Router();
router.get("/", async (request, response, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const [orders, customers, products, recentOrders, monthOrders, lowStock, awaitingDispatch, newCustomers, revenueTrend, weeklyOrders, orderStatuses, topProducts, customerFrequency] = await Promise.all([
      Order.find({ status: { $ne: "Cancelled" } }).select("total").lean(),
      User.countDocuments({ role: "customer" }),
      Product.countDocuments(),
      Order.find().populate("customer", "name").sort({ createdAt: -1 }).limit(5).lean(),
      Order.find({ createdAt: { $gte: monthStart }, status: { $ne: "Cancelled" } }).select("total").lean(),
      Product.find({ status: "Published", stock: { $lte: 10 } }).select("name stock category").sort({ stock: 1 }).limit(8).lean(),
      Order.countDocuments({ status: "Processing" }),
      User.countDocuments({ role: "customer", createdAt: { $gte: weekStart } }),
      Order.aggregate([
        { $match: { status: { $ne: "Cancelled" }, createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { status: { $ne: "Cancelled" }, createdAt: { $gte: weekStart } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, orders: { $sum: 1 }, revenue: { $sum: "$total" } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { status: { $ne: "Cancelled" } } },
        { $unwind: "$items" },
        { $group: { _id: "$items.product", name: { $first: "$items.name" }, image: { $first: "$items.image" }, sold: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } },
        { $sort: { sold: -1, revenue: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: { status: { $ne: "Cancelled" } } },
        { $group: { _id: "$customer", orders: { $sum: 1 } } },
        { $group: { _id: null, customerCount: { $sum: 1 }, repeatCustomers: { $sum: { $cond: [{ $gt: ["$orders", 1] }, 1, 0] } } } },
      ]),
    ]);
    response.json({ success: true, data: {
      revenue: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      monthlyRevenue: monthOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      orderCount: orders.length,
      monthlyOrderCount: monthOrders.length,
      customerCount: customers,
      productCount: products,
      recentOrders,
      lowStock,
      awaitingDispatch,
      newCustomers,
      revenueTrend,
      weeklyOrders,
      orderStatuses: Object.fromEntries(orderStatuses.map((item) => [item._id, item.count])),
      topProducts,
      repeatCustomerRate: customerFrequency[0]?.customerCount ? Math.round(customerFrequency[0].repeatCustomers / customerFrequency[0].customerCount * 100) : 0,
    } });
  } catch (error) { next(error); }
});
module.exports = router;