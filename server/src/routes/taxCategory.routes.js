const express = require("express");
const { z } = require("zod");
const Product = require("../models/Product");
const TaxCategory = require("../models/TaxCategory");

const router = express.Router();
const taxCategorySchema = z.object({
  appliedOn: z.enum(["Sales", "Purchase", "Both"]).default("Both"),
  supplyType: z.enum(["Within State", "Interstate", "Any"]).default("Any"),
  taxType: z.enum(["GST", "VAT", "Other", "Stock Transfer"]).default("GST"),
  taxRate: z.coerce.number().min(0).max(100),
  form: z.string().trim().max(80).optional().default(""),
  state: z.string().trim().max(80).optional().default(""),
  forVat: z.preprocess((value) => value === true || value === "true" ? true : value === false || value === "false" ? false : value, z.boolean()).optional().default(false),
  taxCode: z.string().trim().min(1).max(30),
  description: z.string().trim().max(180).optional().default(""),
  taxRatePostingAccount: z.string().trim().max(120).optional().default(""),
  salesPurchasePostingAccount: z.string().trim().max(120).optional().default(""),
  returnsPostingAccount: z.string().trim().max(120).optional().default(""),
  claimsPostingAccount: z.string().trim().max(120).optional().default(""),
  active: z.preprocess((value) => value === true || value === "true" ? true : value === false || value === "false" ? false : value, z.boolean()).optional().default(true),
});

const normalizeTaxCategory = (data) => ({ ...data, taxCode: data.taxCode.trim().toLocaleUpperCase() });

router.get("/", async (request, response, next) => {
  try {
    const categories = await TaxCategory.find().sort({ appliedOn: 1, taxCode: 1 }).lean();
    response.json({ success: true, data: categories });
  } catch (error) { next(error); }
});

router.post("/", async (request, response, next) => {
  try {
    const data = normalizeTaxCategory(taxCategorySchema.parse(request.body));
    if (await TaxCategory.exists({ taxCode: data.taxCode })) return response.status(409).json({ success: false, message: "This tax code already exists." });
    const category = await TaxCategory.create(data);
    response.status(201).json({ success: true, data: category });
  } catch (error) { next(error); }
});

router.put("/:id", async (request, response, next) => {
  try {
    const data = normalizeTaxCategory(taxCategorySchema.parse(request.body));
    const duplicate = await TaxCategory.exists({ _id: { $ne: request.params.id }, taxCode: data.taxCode });
    if (duplicate) return response.status(409).json({ success: false, message: "This tax code already exists." });
    const purchaseUse = await Product.exists({ purchaseTaxCategory: request.params.id });
    const salesUse = await Product.exists({ salesTaxCategory: request.params.id });
    if (purchaseUse && data.appliedOn === "Sales") return response.status(409).json({ success: false, message: "Products use this code for purchase tax. Change those product codes before limiting it to sales." });
    if (salesUse && data.appliedOn === "Purchase") return response.status(409).json({ success: false, message: "Products use this code for sales tax. Change those product codes before limiting it to purchases." });
    const category = await TaxCategory.findByIdAndUpdate(request.params.id, data, { new: true, runValidators: true });
    if (!category) return response.status(404).json({ success: false, message: "Tax category not found." });
    response.json({ success: true, data: category });
  } catch (error) { next(error); }
});

router.delete("/:id", async (request, response, next) => {
  try {
    const category = await TaxCategory.findById(request.params.id);
    if (!category) return response.status(404).json({ success: false, message: "Tax category not found." });
    if (await Product.exists({ $or: [{ purchaseTaxCategory: category._id }, { salesTaxCategory: category._id }] })) {
      return response.status(409).json({ success: false, message: "Products use this tax code. Assign another code before deleting it." });
    }
    await category.deleteOne();
    response.json({ success: true, message: "Tax category deleted." });
  } catch (error) { next(error); }
});

module.exports = router;
