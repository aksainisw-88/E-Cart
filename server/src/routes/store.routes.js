const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { z } = require("zod");
const StoreSettings = require("../models/StoreSettings");

const router = express.Router();
const logoDirectory = path.join(__dirname, "../../uploads/store");
fs.mkdirSync(logoDirectory, { recursive: true });
const logoUpload = multer({
  storage: multer.diskStorage({ destination: logoDirectory, filename: (request, file, callback) => callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`) }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (request, file, callback) => callback(null, /^image\/(jpeg|png|webp|svg\+xml)$/.test(file.mimetype)),
});
const settingsSchema = z.object({
  name: z.string().trim().min(2).max(100), tagline: z.string().trim().max(160), description: z.string().trim().max(500), phone: z.string().trim().min(5), email: z.string().email(), address: z.string().trim().min(2), deliveryFee: z.coerce.number().min(0), freeDeliveryAbove: z.coerce.number().min(0), deliveryPincode: z.string().trim().regex(/^$|^\d{6}$/), deliveryRadiusKm: z.coerce.number().min(0).max(500), deliveryLatitude: z.coerce.number().min(-90).max(90).optional(), deliveryLongitude: z.coerce.number().min(-180).max(180).optional(), deliveryPincodes: z.array(z.string().regex(/^\d{6}$/)).default([]), theme: z.enum(["teal", "blue", "emerald", "amber"]), hours: z.record(z.object({ open: z.string(), close: z.string(), closed: z.boolean() })),
});

const defaults = { name: "My Medical Store", tagline: "Your Health, Our Priority", description: "Trusted healthcare products delivered with care, speed, and confidence.", phone: "1800-123-4567", email: "care@mymedicalstore.com", address: "New Delhi, India", deliveryFee: 49, freeDeliveryAbove: 999, theme: "teal", testimonials: [{ name: "10 minute grocery now", message: "Get your essentials delivered quickly from stores near you." }, { name: "Best prices & offers", message: "Great value, honest prices and offers you can count on." }, { name: "Wide assortment", message: "Explore medicines, personal care, wellness and more." }, { name: "Genuine products", message: "Every order is packed with care and delivered with confidence." }], hours: { mon: { open: "09:00", close: "18:00", closed: false }, tue: { open: "09:00", close: "18:00", closed: false }, wed: { open: "09:00", close: "18:00", closed: false }, thu: { open: "09:00", close: "18:00", closed: false }, fri: { open: "09:00", close: "18:00", closed: false }, sat: { open: "10:00", close: "16:00", closed: false }, sun: { open: "09:00", close: "18:00", closed: true } } };
const providerDefaults = { phonepe: {}, paytm: {}, fingpay: {}, pinelab: {} };
const providerSchema = z.object({ enabled: z.coerce.boolean().default(false), mode: z.enum(["test", "live"]).default("test"), merchantId: z.string().trim().max(160).default(""), terminalId: z.string().trim().max(160).default(""), deviceId: z.string().trim().max(160).default(""), apiKey: z.string().max(300).default(""), apiSecret: z.string().max(300).default("") });
const integrationsSchema = z.object({ phonepe: providerSchema, paytm: providerSchema, fingpay: providerSchema, pinelab: providerSchema });
const testimonialsSchema = z.object({ testimonials: z.array(z.object({ name: z.string().trim().min(2).max(80), message: z.string().trim().min(2).max(180) })).length(4) });
const heroSlideSchema = z.object({ eyebrow: z.string().trim().max(100), title: z.string().trim().min(2).max(160), description: z.string().trim().min(2).max(300), button: z.string().trim().max(40), to: z.string().trim().max(160), image: z.string().refine((value) => /^\//.test(value) || /^https?:\/\//.test(value), "A valid image URL is required.") });

const maskIntegrations = (integrations = {}) => Object.fromEntries(Object.keys(providerDefaults).map((provider) => {
  const current = integrations[provider] || {};
  return [provider, { enabled: Boolean(current.enabled), mode: current.mode || "test", merchantId: current.merchantId || "", terminalId: current.terminalId || "", deviceId: current.deviceId || "", apiKey: "", apiSecret: "", apiKeyConfigured: Boolean(current.apiKey), apiSecretConfigured: Boolean(current.apiSecret) }];
}));

router.get("/", async (request, response, next) => { try { const settings = await StoreSettings.findOne({ key: "default" }).lean(); response.json({ success: true, data: settings || defaults }); } catch (error) { next(error); } });
router.put("/testimonials", async (request, response, next) => { try { const data = testimonialsSchema.parse(request.body); const settings = await StoreSettings.findOneAndUpdate({ key: "default" }, { key: "default", testimonials: data.testimonials }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean(); response.json({ success: true, data: settings.testimonials }); } catch (error) { next(error); } });
router.put("/hero-slides", logoUpload.fields([{ name: "image0", maxCount: 1 }, { name: "image1", maxCount: 1 }, { name: "image2", maxCount: 1 }]), async (request, response, next) => {
  try {
    const submittedSlides = JSON.parse(request.body.slides || "[]");
    const current = await StoreSettings.findOne({ key: "default" }).lean();
    const slides = submittedSlides.map((slide, index) => ({ ...slide, image: request.files?.[`image${index}`]?.[0] ? `/uploads/store/${request.files[`image${index}`][0].filename}` : slide.image || current?.heroSlides?.[index]?.image || "" }));
    const data = z.array(heroSlideSchema).length(3).parse(slides);
    const settings = await StoreSettings.findOneAndUpdate({ key: "default" }, { key: "default", heroSlides: data }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
    response.json({ success: true, data: settings.heroSlides });
  } catch (error) { next(error); }
});
router.put("/", logoUpload.single("logo"), async (request, response, next) => { try { const data = settingsSchema.parse({ ...request.body, hours: JSON.parse(request.body.hours || "{}"), deliveryPincodes: JSON.parse(request.body.deliveryPincodes || "[]") }); if (request.file) data.logo = `/uploads/store/${request.file.filename}`; const settings = await StoreSettings.findOneAndUpdate({ key: "default" }, { ...data, key: "default" }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }); response.json({ success: true, data: settings }); } catch (error) { next(error); } });
router.post("/reset", async (request, response, next) => { try { const settings = await StoreSettings.findOneAndUpdate({ key: "default" }, { ...defaults, key: "default", logo: "" }, { new: true, upsert: true, setDefaultsOnInsert: true }); response.json({ success: true, data: settings }); } catch (error) { next(error); } });

router.get("/delivery-settings", async (request, response, next) => { try { const settings = await StoreSettings.findOne({ key: "default" }).select("deliveryPincode deliveryRadiusKm deliveryLatitude deliveryLongitude deliveryPincodes").lean(); response.json({ success: true, data: settings || { deliveryPincode: "", deliveryRadiusKm: 10, deliveryPincodes: [] } }); } catch (error) { next(error); } });
router.put("/delivery-settings", async (request, response, next) => { try { const data = z.object({ deliveryPincode: z.string().regex(/^\d{6}$/), deliveryRadiusKm: z.coerce.number().min(0).max(500), deliveryLatitude: z.coerce.number().min(-90).max(90).optional(), deliveryLongitude: z.coerce.number().min(-180).max(180).optional(), deliveryPincodes: z.array(z.string().regex(/^\d{6}$/)).default([]) }).parse(request.body); const settings = await StoreSettings.findOneAndUpdate({ key: "default" }, { ...data, key: "default" }, { new: true, upsert: true, setDefaultsOnInsert: true }).select("deliveryPincode deliveryRadiusKm deliveryLatitude deliveryLongitude deliveryPincodes"); response.json({ success: true, data: settings }); } catch (error) { next(error); } });

router.get("/payment-integrations", async (request, response, next) => { try { const settings = await StoreSettings.findOne({ key: "default" }).lean(); response.json({ success: true, data: maskIntegrations(settings?.paymentIntegrations) }); } catch (error) { next(error); } });
router.put("/payment-integrations", async (request, response, next) => {
  try {
    const data = integrationsSchema.parse(request.body);
    const settings = await StoreSettings.findOne({ key: "default" });
    const current = settings?.paymentIntegrations || {};
    const paymentIntegrations = Object.fromEntries(Object.keys(providerDefaults).map((provider) => {
      const submitted = data[provider];
      const saved = current[provider] || {};
      return [provider, { ...submitted, apiKey: submitted.apiKey || saved.apiKey || "", apiSecret: submitted.apiSecret || saved.apiSecret || "" }];
    }));
    const updated = await StoreSettings.findOneAndUpdate({ key: "default" }, { key: "default", paymentIntegrations }, { new: true, upsert: true, setDefaultsOnInsert: true });
    response.json({ success: true, data: maskIntegrations(updated.paymentIntegrations) });
  } catch (error) { next(error); }
});

module.exports = router;