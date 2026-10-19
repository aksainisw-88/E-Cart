const express = require("express");
const { z } = require("zod");
const SupportTicket = require("../models/SupportTicket");
const Order = require("../models/Order");
const User = require("../models/User");
const { requireAuth, requireOptionalAuth } = require("../middleware/auth");

const router = express.Router();
const ticketSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(2000),
  orderId: z.string().regex(/^[a-f\d]{24}$/i, "Choose a valid order.").optional(),
});
const updateTicketSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  adminReply: z.string().trim().max(2000).optional(),
}).refine((data) => data.status !== undefined || data.adminReply !== undefined, {
  message: "Please provide a status or admin reply update.",
  path: ["status"],
});

router.post("/", requireOptionalAuth, async (request, response, next) => {
  try {
    const data = ticketSchema.parse(request.body);
    let ticketData = { name: data.name, email: data.email, subject: data.subject, message: data.message, customer: request.user?.id };

    if (data.orderId) {
      if (!request.user) return response.status(401).json({ success: false, message: "Sign in to contact us about an order." });
      if (request.user.role !== "customer") return response.status(403).json({ success: false, message: "Order support is available to the customer who placed the order." });
      const [customer, order] = await Promise.all([
        User.findById(request.user.id).select("name email").lean(),
        Order.findOne({ _id: data.orderId, customer: request.user.id }).select("_id orderNumber").lean(),
      ]);
      if (!customer) return response.status(401).json({ success: false, message: "Customer account was not found. Please sign in again." });
      if (!order) return response.status(404).json({ success: false, message: "That order could not be found in your account." });
      ticketData = { ...ticketData, name: customer.name, email: customer.email, customer: request.user.id, order: order._id, orderNumber: order.orderNumber };
    } else if (!data.name || !data.email) {
      return response.status(400).json({ success: false, message: "Name and email are required." });
    }

    const ticket = await SupportTicket.create(ticketData);
    response.status(201).json({ success: true, data: ticket });
  } catch (error) { next(error); }
});
router.get("/", async (request, response, next) => {
  try { const tickets = await SupportTicket.find().populate("customer", "name email").sort({ createdAt: -1 }); response.json({ success: true, data: tickets }); } catch (error) { next(error); }
});
router.get("/mine", requireAuth, async (request, response, next) => {
  try {
    const tickets = await SupportTicket.find({ customer: request.user.id }).sort({ createdAt: -1 });
    response.json({ success: true, data: tickets });
  } catch (error) {
    next(error);
  }
});
router.patch("/:id", async (request, response, next) => {
  try {
    const data = updateTicketSchema.parse(request.body);
    const update = {};

    if (data.status !== undefined) update.status = data.status;
    if (data.adminReply !== undefined) update.adminReply = data.adminReply;

    const ticket = await SupportTicket.findByIdAndUpdate(request.params.id, update, { new: true, runValidators: true });
    if (!ticket) return response.status(404).json({ success: false, message: "Support ticket not found" });
    response.json({ success: true, data: ticket });
  } catch (error) { next(error); }
});

module.exports = router;
