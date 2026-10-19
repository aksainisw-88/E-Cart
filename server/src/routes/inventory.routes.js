const express = require("express");
const { z } = require("zod");

const Product = require("../models/Product");
const Purchase = require("../models/Purchase");
const StoreLocation = require("../models/StoreLocation");

const router = express.Router();
const locationStockSchema = z.object({
  locationId: z.string().regex(/^[a-f\d]{24}$/i),
  quantity: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});
const variantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().max(80).optional().default(""),
  price: z.coerce.number().min(0).optional(),
  locationStock: z.array(locationStockSchema).max(100),
});
const inventorySchema = z.object({
  locationStock: z.array(locationStockSchema).max(100),
  variants: z.array(variantSchema).max(100),
});

router.get("/", async (request, response, next) => {
  try {
    const [locations, products] = await Promise.all([
      StoreLocation.find().select("name address city pincode active isDefault").sort({ name: 1 }).lean(),
      Product.find().select("name brand unit category price stock locationStock variants").sort({ name: 1 }).lean(),
    ]);
    response.json({ success: true, data: { locations, products } });
  } catch (error) { next(error); }
});

router.post("/reconcile-product-stock", async (request, response, next) => {
  try {
    const products = await Product.find({ "locationStock.0": { $exists: true } })
      .select("_id stock locationStock.quantity")
      .lean();
    const updates = products.flatMap((product) => {
      const stock = product.locationStock.reduce((total, entry) => {
        const quantity = Number(entry.quantity);
        return total + (Number.isFinite(quantity) ? Math.max(quantity, 0) : 0);
      }, 0);
      if (product.stock !== null && product.stock !== undefined && Number(product.stock) === stock) return [];
      const filter = { _id: product._id };
      if (product.stock === undefined) filter.stock = { $exists: false };
      else if (product.stock === null) filter.stock = { $eq: null, $exists: true };
      else filter.stock = product.stock;
      return [{
        updateOne: {
          filter,
          update: { $set: { stock } },
        },
      }];
    });
    if (!updates.length) return response.json({ success: true, updated: 0 });
    const result = await Product.bulkWrite(updates, { ordered: false });
    response.json({ success: true, updated: result.modifiedCount ?? result.nModified ?? 0 });
  } catch (error) { next(error); }
});

router.get("/:productId/purchases", async (request, response, next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(request.params.productId)) {
      return response.status(400).json({ success: false, message: "Product ID is invalid." });
    }
    const purchases = await Purchase.find({ product: request.params.productId, variant: { $ne: "" } })
      .select("invoiceNumber variant batchNumber expiryDate mrp rate unitCost quantity freeQuantity remainingQuantity purchaseDate location")
      .populate("location", "name")
      .sort({ purchaseDate: -1, createdAt: -1 })
      .lean();
    response.json({ success: true, data: purchases });
  } catch (error) { next(error); }
});

router.put("/:productId", async (request, response, next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(request.params.productId)) {
      return response.status(400).json({ success: false, message: "Product ID is invalid." });
    }
    const parsed = inventorySchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({ success: false, message: "Check the stock quantities and variant details." });
    }
    const data = parsed.data;
    const variantNames = data.variants.map((variant) => variant.name.toLocaleLowerCase());
    if (new Set(variantNames).size !== variantNames.length) {
      return response.status(400).json({ success: false, message: "Variant names must be unique within a product." });
    }
    const hasDuplicateLocation = (stock) => new Set(stock.map((item) => item.locationId)).size !== stock.length;
    if (hasDuplicateLocation(data.locationStock) || data.variants.some((variant) => hasDuplicateLocation(variant.locationStock))) {
      return response.status(400).json({ success: false, message: "Each product or variant can have only one stock entry per location." });
    }
    const locationIds = [...new Set([...data.locationStock, ...data.variants.flatMap((variant) => variant.locationStock)].map((item) => item.locationId))];
    const knownLocations = await StoreLocation.find({ _id: { $in: locationIds } }).select("_id").lean();
    if (knownLocations.length !== locationIds.length) {
      return response.status(400).json({ success: false, message: "One or more selected store locations no longer exist." });
    }
    const product = await Product.findById(request.params.productId);
    if (!product) return response.status(404).json({ success: false, message: "Product not found." });

    product.locationStock = data.locationStock.map(({ locationId, quantity }) => ({ location: locationId, quantity }));
    product.variants = data.variants.map((variant) => ({
      name: variant.name,
      sku: variant.sku,
      ...(variant.price === undefined ? {} : { price: variant.price }),
      locationStock: variant.locationStock.map(({ locationId, quantity }) => ({ location: locationId, quantity })),
    }));
    product.stock = data.locationStock.reduce((total, item) => total + item.quantity, 0);
    await product.save();
    response.json({ success: true, data: product });
  } catch (error) { next(error); }
});

module.exports = router;
