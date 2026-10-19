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
const toLocationProduct = (product, locationId, isDefault = false) => {
  if (!locationId) return product;
  const allLocationStock = product.locationStock || [];
  const hasLegacyDefaultStock = isDefault && !allLocationStock.length && Number(product.stock) > 0;
  const locationStock = hasLegacyDefaultStock
    ? [{ location: locationId, quantity: Number(product.stock) }]
    : allLocationStock.filter((entry) => entry.location?.toString() === locationId);
  return {
    ...product,
    stock: hasLegacyDefaultStock ? Number(product.stock) : locationStock.reduce((total, entry) => total + (Number(entry.quantity) || 0), 0),
    locationStock,
    variants: (product.variants || []).map((variant) => ({
      ...variant,
      locationStock: (variant.locationStock || []).filter((entry) => entry.location?.toString() === locationId),
    })),
  };
};

router.get("/", async (request, response, next) => {
  try {
    const locationId = request.user.locationId || "";
    const [locations, products] = await Promise.all([
      StoreLocation.find(locationId ? { _id: locationId } : {}).select("name address city pincode active isDefault").sort({ name: 1 }).lean(),
      Product.find().select("name brand unit category price stock locationStock variants").sort({ name: 1 }).lean(),
    ]);
    response.json({ success: true, data: { locations, products: products.map((product) => toLocationProduct(product, locationId, Boolean(locations[0]?.isDefault))) } });
  } catch (error) { next(error); }
});

router.post("/reconcile-product-stock", async (request, response, next) => {
  try {
    if (request.user.locationId) return response.json({ success: true, updated: 0 });
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
    const filter = { product: request.params.productId, variant: { $ne: "" } };
    if (request.user.locationId) {
      const location = await StoreLocation.findById(request.user.locationId).select("isDefault").lean();
      if (!location) return response.status(403).json({ success: false, message: "Your assigned store location is no longer available." });
      if (location.isDefault) filter.$or = [{ location: location._id }, { location: null }];
      else filter.location = location._id;
    }
    const purchases = await Purchase.find(filter)
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
    const assignedLocationId = request.user.locationId || "";
    const variantNames = data.variants.map((variant) => variant.name.toLocaleLowerCase());
    if (new Set(variantNames).size !== variantNames.length) {
      return response.status(400).json({ success: false, message: "Variant names must be unique within a product." });
    }
    const hasDuplicateLocation = (stock) => new Set(stock.map((item) => item.locationId)).size !== stock.length;
    if (hasDuplicateLocation(data.locationStock) || data.variants.some((variant) => hasDuplicateLocation(variant.locationStock))) {
      return response.status(400).json({ success: false, message: "Each product or variant can have only one stock entry per location." });
    }
    const locationIds = [...new Set([...data.locationStock, ...data.variants.flatMap((variant) => variant.locationStock)].map((item) => item.locationId))];
    if (assignedLocationId && locationIds.some((locationId) => locationId !== assignedLocationId)) {
      return response.status(403).json({ success: false, message: "You can only update stock for your assigned store location." });
    }
    const knownLocations = await StoreLocation.find({ _id: { $in: locationIds } }).select("_id").lean();
    if (knownLocations.length !== locationIds.length) {
      return response.status(400).json({ success: false, message: "One or more selected store locations no longer exist." });
    }
    const product = await Product.findById(request.params.productId);
    if (!product) return response.status(404).json({ success: false, message: "Product not found." });

    if (assignedLocationId) {
      if (!product.locationStock.length && Number(product.stock) > 0) {
        const defaultLocation = await StoreLocation.findOne({ isDefault: true }).select("_id").lean();
        product.locationStock.push({ location: defaultLocation?._id || assignedLocationId, quantity: Number(product.stock) });
      }
      const mergeLocationStock = (existing = [], incoming = []) => {
        const untouched = existing.filter((entry) => entry.location?.toString() !== assignedLocationId);
        const selected = incoming.find((entry) => entry.locationId === assignedLocationId);
        const existingAssigned = existing.find((entry) => entry.location?.toString() === assignedLocationId);
        return selected
          ? [...untouched, { location: assignedLocationId, quantity: selected.quantity }]
          : existingAssigned ? [...untouched, existingAssigned] : untouched;
      };
      const incomingVariants = new Map(data.variants.map((variant) => [variant.name.toLocaleLowerCase(), variant]));
      product.locationStock = mergeLocationStock(product.locationStock, data.locationStock);
      product.variants = [
        ...product.variants.map((variant) => {
          const incoming = incomingVariants.get(variant.name.toLocaleLowerCase());
          if (!incoming) return variant;
          incomingVariants.delete(variant.name.toLocaleLowerCase());
          variant.locationStock = mergeLocationStock(variant.locationStock, incoming.locationStock);
          return variant;
        }),
        ...[...incomingVariants.values()].map((variant) => ({
          name: variant.name,
          sku: variant.sku,
          ...(variant.price === undefined ? {} : { price: variant.price }),
          locationStock: variant.locationStock.map(({ locationId, quantity }) => ({ location: locationId, quantity })),
        })),
      ];
    } else {
      product.locationStock = data.locationStock.map(({ locationId, quantity }) => ({ location: locationId, quantity }));
      product.variants = data.variants.map((variant) => ({
        name: variant.name,
        sku: variant.sku,
        ...(variant.price === undefined ? {} : { price: variant.price }),
        locationStock: variant.locationStock.map(({ locationId, quantity }) => ({ location: locationId, quantity })),
      }));
    }
    product.stock = data.locationStock.reduce((total, item) => total + item.quantity, 0);
    if (assignedLocationId) product.stock = product.locationStock.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
    await product.save();
    const assignedLocation = assignedLocationId ? await StoreLocation.findById(assignedLocationId).select("isDefault").lean() : null;
    response.json({ success: true, data: toLocationProduct(product.toObject(), assignedLocationId, Boolean(assignedLocation?.isDefault)) });
  } catch (error) { next(error); }
});

module.exports = router;
