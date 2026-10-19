const express = require("express");
const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const StoreLocation = require("../models/StoreLocation");
const PosSale = require("../models/PosSale");

const router = express.Router();
router.get("/", async (request, response, next) => {
  try {
    const locationId = request.user.locationId || "";
    const location = locationId ? await StoreLocation.findOne({ _id: locationId, active: true }).select("_id isDefault").lean() : null;
    if (locationId && !location) return response.status(403).json({ success: false, message: "Your assigned store location is no longer available." });
    const orderScope = location ? { store: location._id } : {};
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const [orders, customers, products, recentOrders, monthOrders, lowStockRows, awaitingDispatch, newCustomers, revenueTrend, weeklyOrders, orderStatuses, topProducts, customerFrequency] = await Promise.all([
      Order.find({ status: { $ne: "Cancelled" }, ...orderScope }).select("total").lean(),
      location ? Promise.all([Order.distinct("customer", orderScope), PosSale.distinct("customer", { location: location._id, customer: { $ne: null } })]).then(([orderCustomers, posCustomers]) => [...new Set([...orderCustomers, ...posCustomers].map(String))]) : User.countDocuments({ role: "customer" }),
      Product.countDocuments(),
      Order.find(orderScope).populate("customer", "name").populate("store", "name").sort({ createdAt: -1 }).limit(5).lean(),
      Order.find({ createdAt: { $gte: monthStart }, status: { $ne: "Cancelled" }, ...orderScope }).select("total").lean(),
      location ? Product.find({ status: "Published" }).select("name stock category locationStock").sort({ name: 1 }).limit(5000).lean() : Product.find({ status: "Published", stock: { $lte: 10 } }).select("name stock category").sort({ stock: 1 }).limit(8).lean(),
      Order.countDocuments({ status: "Processing", ...orderScope }),
      location ? Order.distinct("customer", { ...orderScope, createdAt: { $gte: weekStart } }) : User.countDocuments({ role: "customer", createdAt: { $gte: weekStart } }),
      Order.aggregate([
        { $match: { status: { $ne: "Cancelled" }, createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) }, ...orderScope } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { status: { $ne: "Cancelled" }, createdAt: { $gte: weekStart }, ...orderScope } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, orders: { $sum: 1 }, revenue: { $sum: "$total" } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: orderScope },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { status: { $ne: "Cancelled" }, ...orderScope } },
        { $unwind: "$items" },
        { $group: { _id: "$items.product", name: { $first: "$items.name" }, image: { $first: "$items.image" }, sold: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } },
        { $sort: { sold: -1, revenue: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: { status: { $ne: "Cancelled" }, ...orderScope } },
        { $group: { _id: "$customer", orders: { $sum: 1 } } },
        { $group: { _id: null, customerCount: { $sum: 1 }, repeatCustomers: { $sum: { $cond: [{ $gt: ["$orders", 1] }, 1, 0] } } } },
      ]),
    ]);
    const customerCount = Array.isArray(customers) ? new Set(customers.map(String)).size : customers;
    const lowStock = location ? lowStockRows.map((product) => {
      const branchStock = product.locationStock?.find((entry) => entry.location?.toString() === location._id.toString());
      const stock = branchStock ? Number(branchStock.quantity) || 0 : location.isDefault && !(product.locationStock || []).length ? Number(product.stock) || 0 : 0;
      return { _id: product._id, name: product.name, category: product.category, stock };
    }).filter((product) => product.stock <= 10).sort((first, second) => first.stock - second.stock).slice(0, 8) : lowStockRows;
    response.json({ success: true, data: {
      revenue: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      monthlyRevenue: monthOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      orderCount: orders.length,
      monthlyOrderCount: monthOrders.length,
      customerCount,
      productCount: products,
      recentOrders,
      lowStock,
      awaitingDispatch,
      newCustomers: Array.isArray(newCustomers) ? newCustomers.length : newCustomers,
      revenueTrend,
      weeklyOrders,
      orderStatuses: Object.fromEntries(orderStatuses.map((item) => [item._id, item.count])),
      topProducts,
      repeatCustomerRate: customerFrequency[0]?.customerCount ? Math.round(customerFrequency[0].repeatCustomers / customerFrequency[0].customerCount * 100) : 0,
    } });
  } catch (error) { next(error); }
});
module.exports = router;
