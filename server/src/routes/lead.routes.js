const crypto = require("crypto");
const express = require("express");
const { z } = require("zod");

const Lead = require("../models/Lead");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const { requireAuth, requireRole } = require("../middleware/auth");
const { requireSuperAdminDatabase } = require("../config/superAdminDatabase");
const { sendLeadSignupInvitation } = require("../utils/email");

const router = express.Router();
const leadStatuses = ["New", "Contacted", "Follow-up", "Interested", "Rejected"];
const inquirySchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  contactPerson: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  mobile: z.string().trim().min(5).max(30),
  businessType: z.string().trim().min(2).max(80),
  inquiryType: z.enum(["General", "Demo", "Purchase"]).default("General"),
  description: z.string().trim().min(10).max(2000),
});
const updateLeadSchema = z.object({
  status: z.enum(leadStatuses).optional(),
  followUpAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }).or(z.literal("")).optional(),
  remark: z.string().trim().max(2000).optional(),
}).refine((value) => Object.keys(value).length > 0, "Enter a status, follow-up date, or remark.")
  .refine((value) => value.status !== "Follow-up" || Boolean(value.followUpAt), "Set a follow-up date before using the Follow-up status.");
const publicLead = (lead) => ({
  id: lead._id.toString(),
  leadId: lead.leadId,
  companyName: lead.companyName,
  contactPerson: lead.contactPerson,
  email: lead.email,
  mobile: lead.mobile,
  businessType: lead.businessType,
  inquiryType: lead.inquiryType,
  description: lead.description,
  status: lead.status,
  followUpAt: lead.followUpAt || "",
  tenantId: lead.tenantId || "",
  storeSlug: lead.storeSlug || "",
  createdAt: lead.createdAt,
  updatedAt: lead.updatedAt,
  history: lead.history || [],
  invitationSentAt: lead.invitationSentAt || null,
});
const hashInvitation = (token) => crypto.createHash("sha256").update(token).digest("hex");
const createLeadId = () => `EC-LD-${new Date().getUTCFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
const parseApiOrigin = (value) => {
  try { return new URL(value).origin; } catch { return ""; }
};

router.use(requireSuperAdminDatabase);

router.get("/public/plans", async (request, response, next) => {
  try {
    const plans = await SubscriptionPlan.find({ active: true })
      .select("name description billingInterval price featured")
      .sort({ featured: -1, price: 1 })
      .lean();
    return response.json({ success: true, data: plans.map((plan) => ({
      id: plan._id.toString(),
      name: plan.name,
      description: plan.description,
      billingInterval: plan.billingInterval,
      price: plan.price,
      featured: plan.featured,
    })) });
  } catch (error) {
    return next(error);
  }
});

router.post("/public/inquiries", async (request, response, next) => {
  try {
    const parsed = inquirySchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({ success: false, message: parsed.error.issues[0]?.message || "Check the inquiry details." });
    }

    let leadId;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      leadId = createLeadId();
      if (!await Lead.exists({ leadId })) break;
      leadId = "";
    }
    if (!leadId) return response.status(503).json({ success: false, message: "Unable to create an inquiry ID. Please try again." });

    const lead = await Lead.create({
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
      leadId,
      status: "New",
      history: [{ type: "Inquiry", details: parsed.data.description, createdBy: "Company website" }],
    });
    return response.status(201).json({
      success: true,
      data: { leadId: lead.leadId },
      message: "Thank you. Your inquiry has been sent to E-Cart Infotech.",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/invitations/verify", async (request, response, next) => {
  try {
    const parsed = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/i) }).safeParse(request.body);
    if (!parsed.success) return response.status(404).json({ success: false, message: "This signup invitation is invalid or expired." });
    const lead = await Lead.findOne({
      invitationTokenHash: hashInvitation(parsed.data.token),
      invitationExpiresAt: { $gt: new Date() },
      status: "Interested",
    }).select("leadId companyName contactPerson email mobile businessType").lean();
    if (!lead) return response.status(404).json({ success: false, message: "This signup invitation is invalid or expired." });
    return response.json({ success: true, data: {
      leadId: lead.leadId,
      companyName: lead.companyName,
      contactPerson: lead.contactPerson,
      email: lead.email,
      mobile: lead.mobile,
      businessType: lead.businessType,
    } });
  } catch (error) {
    return next(error);
  }
});

router.use(requireAuth, requireRole("super_admin"));

router.get("/", async (request, response, next) => {
  try {
    const leads = await Lead.find().sort({ updatedAt: -1 }).lean();
    return response.json({ success: true, data: leads.map(publicLead) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", async (request, response, next) => {
  try {
    const parsed = updateLeadSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({ success: false, message: parsed.error.issues[0]?.message || "Check the lead update." });
    }
    const lead = await Lead.findById(request.params.id);
    if (!lead) return response.status(404).json({ success: false, message: "Lead not found." });
    if (lead.status === "Converted") return response.status(409).json({ success: false, message: "Converted lead records are read-only." });

    const { status, followUpAt, remark } = parsed.data;
    if (status && status !== lead.status) {
      lead.status = status;
      lead.history.push({ type: "Status", status, details: `Status changed to ${status}.`, createdBy: request.user.email || "Super Admin" });
      if (status !== "Interested") {
        lead.invitationTokenHash = "";
        lead.invitationExpiresAt = null;
      }
      if (status !== "Follow-up" && followUpAt === undefined) lead.followUpAt = "";
    }
    if (followUpAt !== undefined && followUpAt !== lead.followUpAt) {
      lead.followUpAt = followUpAt;
      lead.history.push({ type: "Follow-up", details: followUpAt ? `Follow-up scheduled for ${followUpAt}.` : "Follow-up date cleared.", createdBy: request.user.email || "Super Admin" });
    }
    if (remark) lead.history.push({ type: "Note", details: remark, createdBy: request.user.email || "Super Admin" });
    await lead.save();
    return response.json({ success: true, data: publicLead(lead.toObject()) });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/convert", async (request, response, next) => {
  try {
    if (!request.app.locals.env.TENANT_MONGO_URI) {
      return response.status(503).json({ success: false, message: "Shared-platform signup is not configured. Configure tenant provisioning before sending signup invitations." });
    }
    const lead = await Lead.findById(request.params.id).select("+invitationTokenHash");
    if (!lead) return response.status(404).json({ success: false, message: "Lead not found." });
    if (lead.status !== "Interested") {
      return response.status(409).json({ success: false, message: "Move this lead to Interested before sending a signup invitation." });
    }
    if (lead.tenantId) return response.status(409).json({ success: false, message: "This lead already completed signup." });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const clientUrl = request.app.locals.env.CLIENT_URL;
    const clientOrigin = parseApiOrigin(clientUrl);
    if (!clientOrigin) return response.status(503).json({ success: false, message: "The client signup URL is not configured on the API." });
    const invitationUrl = `${clientOrigin}/admin/register?invite=${rawToken}`;
    const invitationEmailed = await sendLeadSignupInvitation(lead.email, invitationUrl, request.app.locals.env);

    const sentAt = new Date();
    lead.invitationTokenHash = hashInvitation(rawToken);
    lead.invitationExpiresAt = new Date(sentAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    lead.invitationSentAt = sentAt;
    lead.status = "Interested";
    lead.history.push({
      type: "Invitation",
      details: `Secure signup invitation sent to ${lead.email}.`,
      status: "Interested",
      createdBy: request.user.email || "Super Admin",
      createdAt: sentAt,
    });
    await lead.save();
    return response.json({
      success: true,
      data: publicLead(lead.toObject()),
      message: invitationEmailed
        ? "Signup invitation sent. The lead will be converted after completing account and store setup."
        : "Development mode: invitation email is not configured. Use the temporary signup link below.",
      ...(!invitationEmailed && request.app.locals.env.NODE_ENV !== "production" ? { developmentInvitationUrl: invitationUrl } : {}),
    });
  } catch (error) {
    if (error.message === "Email delivery is not configured.") {
      return response.status(503).json({ success: false, message: "Email delivery is not configured. Configure SMTP before sending signup invitations." });
    }
    return next(error);
  }
});

router.put("/:id/history", async (request, response, next) => {
  try {
    const parsed = z.object({ details: z.string().trim().min(3).max(2000) }).safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: "Enter discussion details." });
    const lead = await Lead.findById(request.params.id);
    if (!lead) return response.status(404).json({ success: false, message: "Lead not found." });
    if (lead.status === "Converted") return response.status(409).json({ success: false, message: "Converted lead records are read-only." });
    lead.history.push({ type: "Note", details: parsed.data.details, createdBy: request.user.email || "Super Admin" });
    await lead.save();
    return response.json({ success: true, data: publicLead(lead.toObject()) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
