const express = require("express");
const { z } = require("zod");
const Offer = require("../models/Offer");

const router = express.Router();
const optionalProductId = z.preprocess((value) => value || undefined, z.string().optional());
const offerSchema = z.object({ title: z.string().min(2), description: z.string().min(2), code: z.string().optional(), offerType: z.enum(["discount", "buy_one_get_one", "buy_product_get_product"]).default("discount"), discountType: z.enum(["percentage", "flat"]), discountValue: z.coerce.number().min(0), buyProduct: optionalProductId, freeProduct: optionalProductId, buyQuantity: z.coerce.number().int().min(1).default(1), freeQuantity: z.coerce.number().int().min(1).default(1), minOrder: z.coerce.number().min(0), startsAt: z.coerce.date(), endsAt: z.coerce.date(), status: z.enum(["Active", "Draft", "Expired"]) }).superRefine((data, context) => {
	if (data.offerType !== "discount" && !data.code) context.addIssue({ code: "custom", path: ["code"], message: "A promo code is required for scheme offers." });
	if (data.offerType !== "discount" && !data.buyProduct) context.addIssue({ code: "custom", path: ["buyProduct"], message: "Select the qualifying product." });
	if (data.offerType === "buy_product_get_product" && !data.freeProduct) context.addIssue({ code: "custom", path: ["freeProduct"], message: "Select the free product." });
});

router.get("/", async (request, response, next) => { try { const offers = await Offer.find().sort({ createdAt: -1 }); response.json({ success: true, data: offers }); } catch (error) { next(error); } });
router.post("/", async (request, response, next) => { try { const offer = await Offer.create(offerSchema.parse(request.body)); response.status(201).json({ success: true, data: offer }); } catch (error) { next(error); } });
router.put("/:id", async (request, response, next) => { try { const offer = await Offer.findByIdAndUpdate(request.params.id, offerSchema.parse(request.body), { new: true, runValidators: true }); if (!offer) return response.status(404).json({ success: false, message: "Offer not found" }); response.json({ success: true, data: offer }); } catch (error) { next(error); } });
router.delete("/:id", async (request, response, next) => { try { await Offer.findByIdAndDelete(request.params.id); response.json({ success: true }); } catch (error) { next(error); } });

module.exports = router;