const express = require("express");
const { z } = require("zod");
const SupportTicket = require("../models/SupportTicket");
const { requireAuth, requireOptionalAuth } = require("../middleware/auth");

const router = express.Router();
const ticketSchema = z.object({ name: z.string().min(2), email: z.string().email(), subject: z.string().min(2), message: z.string().min(10) });
const updateTicketSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  adminReply: z.string().trim().max(2000).optional(),
}).refine((data) => data.status !== undefined || data.adminReply !== undefined, {
  message: "Please provide a status or admin reply update.",
  path: ["status"],
});

router.post("/", requireOptionalAuth, async (request, response, next) => {
  try { const data = ticketSchema.parse(request.body); const ticket = await SupportTicket.create({ ...data, customer: request.user?.id }); response.status(201).json({ success: true, data: ticket }); } catch (error) { next(error); }
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