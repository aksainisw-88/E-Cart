const express = require("express");
const { randomUUID } = require("crypto");
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const { z } = require("zod");
const Product = require("../models/Product");
const Purchase = require("../models/Purchase");
const Vendor = require("../models/Vendor");
const StoreLocation = require("../models/StoreLocation");
const PurchaseAdjustment = require("../models/PurchaseAdjustment");

const router = express.Router();
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const purchaseSchema = z.object({
  vendor: z.string().min(1),
  product: z.string().min(1),
  variant: z.string().trim().max(120).optional().default(""),
  vendorInvoiceNumber: z.string().trim().max(120).optional().default(""),
  referenceNumber: z.string().trim().max(120).optional().default(""),
  location: z.string().trim().max(120).optional().default(""),
  batchNumber: z.string().trim().max(100).optional().default(""),
  expiryDate: z.coerce.date().optional(),
  mrp: z.coerce.number().min(0).default(0),
  rate: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().int().positive(),
  freeQuantity: z.coerce.number().int().min(0).default(0),
  unitCost: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
  taxCode: z.string().trim().max(30).optional().default(""),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  purchaseDate: z.coerce.date(),
});
const variantCreateSchema = z.object({
  productId: z.string().regex(/^[a-f\d]{24}$/i),
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().max(80).optional().default(""),
  price: z.coerce.number().min(0).optional(),
});
const adjustmentSchema = z.object({
  product: z.string().min(1),
  vendor: z.string().optional().or(z.literal("")),
  location: z.union([z.string().regex(/^[a-f\d]{24}$/i), z.literal("")]).optional().default(""),
  stockAdjustment: z.coerce.number().int(),
  balanceAdjustment: z.coerce.number().default(0),
  reason: z.string().trim().min(3),
  adjustmentDate: z.coerce.date(),
});

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeText = (value) => String(value ?? "").trim();
const normalizeNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const cleaned = String(value).replace(/[₹,\s]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const resolveVendor = async (value) => {
  const input = normalizeText(value);
  if (!input) return null;
  const existing = await Vendor.findById(input).catch(() => null) || await Vendor.findOne({ name: { $regex: new RegExp(`^${escapeRegExp(input)}$`, "i") } });
  return existing || Vendor.create({ name: input });
};
const resolveProduct = async (value) => {
  const input = normalizeText(value);
  if (!input) return null;
  return await Product.findById(input).catch(() => null) || await Product.findOne({ name: { $regex: new RegExp(`^${escapeRegExp(input)}$`, "i") } });
};
const resolveLocation = async (value) => {
  const input = normalizeText(value);
  if (!input) return null;
  if (/^[a-f\d]{24}$/i.test(input)) return StoreLocation.findOne({ _id: input, active: true }).select("_id").lean();
  return StoreLocation.findOne({ name: { $regex: new RegExp(`^${escapeRegExp(input)}$`, "i") }, active: true }).select("_id").lean();
};
const getAmounts = (data) => {
  const rate = data.rate ?? data.unitCost;
  const taxAmount = Number((data.quantity * rate * data.taxRate / 100).toFixed(2));
  const amount = Math.max(Number((data.quantity * rate + taxAmount - data.discount).toFixed(2)), 0);
  return { rate, taxAmount, amount, total: amount };
};
const createInvoiceNumber = () => `PUR-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;

const changeProductStock = (product, locationId, quantityChange, legacyStockLocationId = locationId) => {
  if (!locationId) {
    product.stock = Math.max(0, Number(product.stock || 0) + quantityChange);
    return;
  }
  product.locationStock ||= [];
  if (!product.locationStock.length && Number(product.stock) > 0) {
    product.locationStock.push({ location: legacyStockLocationId, quantity: Number(product.stock) });
  }
  const locationEntry = product.locationStock.find((entry) => entry.location.toString() === locationId.toString());
  if (locationEntry) locationEntry.quantity = Math.max(0, locationEntry.quantity + quantityChange);
  else if (quantityChange > 0) product.locationStock.push({ location: locationId, quantity: quantityChange });
  product.stock = product.locationStock.reduce((total, entry) => total + (Number(entry.quantity) || 0), 0);
};
const changeProductStockAtLocation = async (product, locationId, quantityChange) => {
  if (!product || !locationId) return changeProductStock(product, locationId, quantityChange);
  const defaultLocation = await StoreLocation.findOne({ isDefault: true }).select("_id").lean();
  changeProductStock(product, locationId, quantityChange, defaultLocation?._id || locationId);
};

const resolveActiveLocation = async (locationId) => resolveLocation(locationId);
const assignedLocationFor = async (request) => {
  if (!request.user.locationId) return null;
  const location = await StoreLocation.findOne({ _id: request.user.locationId, active: true }).select("_id name isDefault").lean();
  if (!location) throw Object.assign(new Error("Your assigned store location is no longer available."), { statusCode: 403 });
  return location;
};
const purchaseBelongsToLocation = (purchase, location) => Boolean(
  location && (purchase.location?.toString() === location._id.toString() || (location.isDefault && !purchase.location)),
);

const findVariant = (product, variantInput) => {
  const value = normalizeText(variantInput);
  if (!product || !value || !Array.isArray(product.variants)) return null;
  return product.variants.find((variant) => {
    const variantId = String(variant?._id || "");
    const variantName = normalizeText(variant?.name);
    const variantSku = normalizeText(variant?.sku);
    return variantId === value || variantName.toLowerCase() === value.toLowerCase() || variantSku.toLowerCase() === value.toLowerCase();
  }) || null;
};

const updateVariantStock = (product, variantInput, locationId, quantityChange) => {
  const value = normalizeText(variantInput);
  if (!product || !value || !Array.isArray(product.variants) || !locationId) return;
  const target = findVariant(product, value);
  if (!target) return;
  target.locationStock ||= [];
  const locationEntry = target.locationStock.find((entry) => entry.location?.toString() === locationId.toString());
  if (locationEntry) locationEntry.quantity = Math.max(0, Number(locationEntry.quantity || 0) + quantityChange);
  else if (quantityChange > 0) target.locationStock.push({ location: locationId, quantity: quantityChange });
};

const createPurchase = async (input, invoiceGroupId, assignedLocationId = "") => {
  const groupId = invoiceGroupId || `PINV-${randomUUID()}`;
  if (Array.isArray(input?.items) && input.items.length) {
    const created = [];
    for (const item of input.items) created.push(await createPurchase(item, groupId, assignedLocationId));
    return created;
  }
  const data = purchaseSchema.parse(assignedLocationId ? { ...input, location: assignedLocationId } : input);
  const [vendor, product] = await Promise.all([resolveVendor(data.vendor), resolveProduct(data.product)]);
  if (!product) throw new Error("Product not found. Use the product ID or exact product name.");
  await product.populate("purchaseTaxCategory", "taxCode taxRate");
  const purchaseData = { ...data, taxCode: product.purchaseTaxCategory?.taxCode || data.taxCode, taxRate: product.purchaseTaxCategory ? Number(product.purchaseTaxCategory.taxRate) || 0 : data.taxRate };
  const productVariant = data.variant ? findVariant(product, data.variant) : null;
  if (data.variant && !productVariant) throw Object.assign(new Error("Select a variant that belongs to the chosen product."), { statusCode: 400 });
  const location = await resolveActiveLocation(data.location);
  if (data.location && !location) throw Object.assign(new Error("Select an active stock location."), { statusCode: 400 });
  if (productVariant && !location) throw Object.assign(new Error("A stock location is required for variant purchases."), { statusCode: 400 });
  const amounts = getAmounts(purchaseData);
  const purchase = await Purchase.create({ ...purchaseData, invoiceGroupId: groupId, variant: productVariant?.name || "", ...amounts, remainingQuantity: data.quantity + data.freeQuantity, invoiceNumber: createInvoiceNumber(), vendor: vendor._id, product: product._id, location: location?._id, productName: product.name });
  const purchaseQuantity = data.quantity + data.freeQuantity;
  await changeProductStockAtLocation(product, location?._id, purchaseQuantity);
  if (productVariant) updateVariantStock(product, productVariant.name, location?._id, purchaseQuantity);
  product.costPrice = data.unitCost;
  if (data.mrp > 0) product.originalPrice = data.mrp;
  product.vendorName = vendor.name;
  product.purchaseDate = data.purchaseDate;
  await product.save();
  vendor.pendingAmount += amounts.total;
  await vendor.save();
  return purchase.populate("vendor", "name").then((entry) => entry.populate("product", "name category price")).then((entry) => entry.populate("location", "name city"));
};

router.get("/", async (request, response, next) => {
  try {
    const filter = request.query.vendor ? { vendor: request.query.vendor } : {};
    const assignedLocation = await assignedLocationFor(request);
    if (assignedLocation) {
      const locationFilter = assignedLocation.isDefault
        ? { $or: [{ location: assignedLocation._id }, { location: null }] }
        : { location: assignedLocation._id };
      Object.assign(filter, locationFilter);
    }
    const purchases = await Purchase.find(filter).populate("vendor", "name").populate("product", "name").populate("location", "name city").sort({ purchaseDate: -1, createdAt: -1 });
    response.json({ success: true, data: purchases });
  } catch (error) { next(error); }
});

router.get("/adjustments", async (request, response, next) => {
  try {
    const assignedLocation = await assignedLocationFor(request);
    const adjustments = await PurchaseAdjustment.find(assignedLocation ? { location: assignedLocation._id } : {}).populate("product", "name").populate("vendor", "name").populate("location", "name").sort({ adjustmentDate: -1, createdAt: -1 });
    response.json({ success: true, data: adjustments });
  } catch (error) { next(error); }
});

router.post("/", async (request, response, next) => {
  try {
    const purchase = await createPurchase(request.body, undefined, request.user.locationId || "");
    response.status(201).json({ success: true, data: purchase });
  } catch (error) { next(error); }
});

router.post("/variants", async (request, response, next) => {
  try {
    const parsed = variantCreateSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: "Enter a valid product and variant name." });
    const product = await Product.findById(parsed.data.productId);
    if (!product) return response.status(404).json({ success: false, message: "Product not found." });
    if (product.variants.some((variant) => variant.name.toLocaleLowerCase() === parsed.data.name.toLocaleLowerCase())) {
      return response.status(409).json({ success: false, message: "This variant already exists for the selected product." });
    }
    product.variants.push({
      name: parsed.data.name,
      sku: parsed.data.sku,
      ...(parsed.data.price === undefined ? {} : { price: parsed.data.price }),
      locationStock: [],
    });
    await product.save();
    response.status(201).json({ success: true, data: product });
  } catch (error) { next(error); }
});

router.post("/adjustment", async (request, response, next) => {
  try {
    const assignedLocation = await assignedLocationFor(request);
    if (assignedLocation && request.body.location && request.body.location !== assignedLocation._id.toString()) return response.status(403).json({ success: false, message: "You can only adjust stock at your assigned store location." });
    const data = adjustmentSchema.parse(assignedLocation ? { ...request.body, location: assignedLocation._id.toString() } : request.body);
    if (!data.stockAdjustment && !data.balanceAdjustment) return response.status(400).json({ success: false, message: "Enter a stock or balance adjustment." });
    const product = await resolveProduct(data.product);
    if (!product) return response.status(404).json({ success: false, message: "Product not found." });
    const location = data.stockAdjustment || assignedLocation ? await resolveActiveLocation(data.location) : null;
    if (data.stockAdjustment && !location) return response.status(400).json({ success: false, message: "Select an active stock location for this adjustment." });
    if (data.stockAdjustment) {
      product.locationStock ||= [];
      if (!product.locationStock.length && Number(product.stock) > 0) {
        const defaultLocation = await StoreLocation.findOne({ isDefault: true }).select("_id").lean();
        product.locationStock.push({ location: defaultLocation?._id || location._id, quantity: Number(product.stock) });
      }
      const locationEntry = product.locationStock.find((entry) => entry.location.toString() === location._id.toString());
      const locationQuantity = Number(locationEntry?.quantity) || 0;
      if (locationQuantity + data.stockAdjustment < 0) return response.status(400).json({ success: false, message: `Stock adjustment cannot make ${location.name} inventory negative.` });
      if (locationEntry) locationEntry.quantity = locationQuantity + data.stockAdjustment;
      else product.locationStock.push({ location: location._id, quantity: data.stockAdjustment });
      product.stock = product.locationStock.reduce((total, entry) => total + (Number(entry.quantity) || 0), 0);
    }
    const vendor = data.vendor ? await resolveVendor(data.vendor) : null;
    if (vendor && vendor.pendingAmount + data.balanceAdjustment < 0) return response.status(400).json({ success: false, message: "Balance adjustment cannot make pending amount negative." });
    const adjustment = await PurchaseAdjustment.create({ ...data, product: product._id, vendor: vendor?._id, location: location?._id });
    if (data.stockAdjustment) await product.save();
    if (vendor) { vendor.pendingAmount += data.balanceAdjustment; await vendor.save(); }
    response.status(201).json({ success: true, data: adjustment });
  } catch (error) { next(error); }
});

router.post("/import", csvUpload.single("file"), async (request, response, next) => {
  try {
    const assignedLocation = await assignedLocationFor(request);
    if (!request.file) return response.status(400).json({ success: false, message: "CSV file is required" });
    const rows = parse(request.file.buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
    if (!rows.length) return response.status(400).json({ success: false, message: "The CSV does not contain any purchase rows." });
    const skippedRows = [];
    const payloads = rows.map((row, index) => {
      const payload = {
        vendor: row.vendor || row.vendorName || row.supplier || row.supplierName,
        product: row.product || row.productName || row.itemName || row.item,
        variant: row.variant || row.variantName || row.variantSku || "",
        vendorInvoiceNumber: row.vendorInvoiceNumber || row.entryNo || row.entryNumber || row["entry no"] || row.invoiceNumber || row.invoiceNo || row.invoice || row.billNumber,
        referenceNumber: row.referenceNumber || row.ref || row.reference || "",
        location: assignedLocation?._id.toString() || row.location || row.locationName || row.storeLocation || row.branch || "",
        batchNumber: row.batchNumber || row.batch || "",
        expiryDate: row.expiryDate || row.expiry || undefined,
        mrp: normalizeNumber(row.mrp ?? row.mrpPrice ?? row.price, 0),
        rate: normalizeNumber(row.rate ?? row.unitCost ?? row.cost ?? row.purchaseRate, 0),
        quantity: normalizeNumber(row.quantity, 0),
        freeQuantity: normalizeNumber(row.freeQuantity ?? row.freeQty, 0),
        unitCost: normalizeNumber(row.unitCost ?? row.cost ?? row.purchaseCost, 0),
        discount: normalizeNumber(row.discount ?? row.discountAmount, 0),
        taxCode: row.taxCode || "",
        taxRate: normalizeNumber(row.taxRate ?? row.gstRate ?? row.tax, 0),
        purchaseDate: row.purchaseDate || row.entryDate || row["entry date"] || row.date || new Date().toISOString(),
      };
      const hasTransactionFields = [
        row.vendorInvoiceNumber, row.entryNo, row.entryNumber, row["entry no"], row.invoiceNumber, row.invoiceNo, row.invoice, row.billNumber,
        row.referenceNumber, row.ref, row.reference, row.location, row.locationName, row.storeLocation, row.branch,
        row.batchNumber, row.batch, row.expiryDate, row.expiry, row.mrp, row.mrpPrice, row.price,
        row.rate, row.unitCost, row.cost, row.purchaseRate, row.quantity, row.freeQuantity, row.freeQty,
        row.taxCode, row.taxRate, row.gstRate, row.tax, row.discount, row.discountAmount, row.purchaseDate, row.entryDate, row["entry date"], row.date,
      ].some((value) => normalizeText(value) !== "");
      if (!hasTransactionFields && payload.vendor && payload.product) {
        skippedRows.push(index + 2);
        return null;
      }
      const parsed = purchaseSchema.safeParse(payload);
      if (!parsed.success) {
        const details = parsed.error.issues.map((issue) => `${issue.path.join(" ") || "value"}: ${issue.message}`).join("; ");
        throw Object.assign(new Error(`CSV row ${index + 2} is incomplete or invalid (${details}). No purchase rows were imported.`), { statusCode: 400 });
      }
      return parsed.data;
    }).filter(Boolean);
    if (!payloads.length) return response.status(400).json({ success: false, message: "The CSV does not contain any complete purchase rows." });

    const groups = new Map();
    payloads.forEach((payload, index) => {
      const invoiceNumber = normalizeText(payload.vendorInvoiceNumber).toLocaleLowerCase();
      const date = payload.purchaseDate.toISOString().slice(0, 10);
      const vendor = normalizeText(payload.vendor).toLocaleLowerCase();
      const location = normalizeText(payload.location).toLocaleLowerCase();
      const key = invoiceNumber
        ? JSON.stringify([vendor, invoiceNumber, date, location])
        : `row:${index}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(payload);
    });

    const imported = [];
    for (const items of groups.values()) imported.push(...await createPurchase({ items }, undefined, assignedLocation?._id.toString() || ""));
    response.status(201).json({ success: true, imported: groups.size, importedInvoices: groups.size, importedLines: imported.length, skippedRows, data: imported });
  } catch (error) { next(error); }
});

router.put("/:id", async (request, response, next) => {
  try {
    const oldPurchase = await Purchase.findById(request.params.id);
    if (!oldPurchase) return response.status(404).json({ success: false, message: "Purchase entry not found" });
    const assignedLocation = await assignedLocationFor(request);
    if (assignedLocation && !purchaseBelongsToLocation(oldPurchase, assignedLocation)) return response.status(404).json({ success: false, message: "Purchase entry not found at your assigned location." });
    if (assignedLocation && request.body.location && request.body.location !== assignedLocation._id.toString()) return response.status(403).json({ success: false, message: "You can only edit purchases for your assigned store location." });
    const data = purchaseSchema.parse(assignedLocation ? { ...request.body, location: assignedLocation._id.toString() } : request.body);
    const defaultLocation = assignedLocation?.isDefault ? assignedLocation : await StoreLocation.findOne({ isDefault: true }).select("_id").lean();
    const oldLocationId = oldPurchase.location || defaultLocation?._id;
    const [vendor, product] = await Promise.all([resolveVendor(data.vendor), resolveProduct(data.product)]);
    if (!product) return response.status(404).json({ success: false, message: "Product not found" });
    await product.populate("purchaseTaxCategory", "taxCode taxRate");
    const productVariant = data.variant ? findVariant(product, data.variant) : null;
    if (data.variant && !productVariant) return response.status(400).json({ success: false, message: "Select a variant that belongs to the chosen product." });
    const location = await resolveActiveLocation(data.location);
    if (data.location && !location) return response.status(400).json({ success: false, message: "Select an active stock location." });
    if (productVariant && !location) return response.status(400).json({ success: false, message: "A stock location is required for variant purchases." });
    const oldProduct = await Product.findById(oldPurchase.product);
    const oldVendor = await Vendor.findById(oldPurchase.vendor);
    const sameProduct = Boolean(oldProduct && oldProduct._id.equals(product._id));
    const stockProduct = sameProduct ? oldProduct : product;
    const sameProductLocation = sameProduct && oldLocationId?.toString() === location?._id.toString();
    const oldPurchasedQuantity = Number(oldPurchase.quantity) + Number(oldPurchase.freeQuantity || 0);
    const oldRemainingQuantity = Math.min(oldPurchasedQuantity, Math.max(0, Number(oldPurchase.remainingQuantity ?? oldPurchasedQuantity)));
    const soldQuantity = oldPurchasedQuantity - oldRemainingQuantity;
    const newPurchasedQuantity = data.quantity + data.freeQuantity;
    const sameExpiry = (!oldPurchase.expiryDate && !data.expiryDate) || (oldPurchase.expiryDate && data.expiryDate && oldPurchase.expiryDate.getTime() === data.expiryDate.getTime());
    const sameBatch = sameProductLocation && oldPurchase.batchNumber === data.batchNumber && sameExpiry && (oldPurchase.variant || "") === (productVariant?.name || "");
    if (soldQuantity > 0 && !sameBatch) return response.status(400).json({ success: false, message: "A batch with sold units cannot be moved or renamed." });
    if (newPurchasedQuantity < soldQuantity) return response.status(400).json({ success: false, message: "Purchase quantity cannot be lower than the quantity already sold." });
    const remainingQuantity = newPurchasedQuantity - soldQuantity;
    const sameVendor = Boolean(oldVendor && oldVendor._id.equals(vendor._id));
    const balanceVendor = sameVendor ? oldVendor : vendor;
    if (sameProductLocation) {
      await changeProductStockAtLocation(stockProduct, location?._id, remainingQuantity - oldRemainingQuantity);
    } else if (oldProduct) {
      await changeProductStockAtLocation(oldProduct, oldLocationId, -oldRemainingQuantity);
    }
    if (oldProduct) updateVariantStock(oldProduct, oldPurchase.variant, oldLocationId, -oldRemainingQuantity);
    if (oldVendor) oldVendor.pendingAmount = Math.max(0, oldVendor.pendingAmount - oldPurchase.total);
    if (oldProduct && !sameProduct) await oldProduct.save();
    if (oldVendor && !sameVendor) await oldVendor.save();
    const purchaseData = { ...data, taxCode: product.purchaseTaxCategory?.taxCode || data.taxCode, taxRate: product.purchaseTaxCategory ? Number(product.purchaseTaxCategory.taxRate) || 0 : data.taxRate };
    const amounts = getAmounts(purchaseData);
    const purchase = await Purchase.findByIdAndUpdate(request.params.id, { ...purchaseData, variant: productVariant?.name || "", ...amounts, remainingQuantity, invoiceNumber: oldPurchase.invoiceNumber, vendor: vendor._id, product: product._id, location: location?._id, productName: product.name }, { new: true, runValidators: true }).populate("vendor", "name").populate("product", "name").populate("location", "name city");
    if (!sameProductLocation) await changeProductStockAtLocation(stockProduct, location?._id, remainingQuantity);
    if (productVariant) updateVariantStock(stockProduct, productVariant.name, location?._id, remainingQuantity);
    stockProduct.costPrice = data.unitCost;
    if (data.mrp > 0) stockProduct.originalPrice = data.mrp;
    stockProduct.vendorName = vendor.name;
    stockProduct.purchaseDate = data.purchaseDate;
    await stockProduct.save();
    balanceVendor.pendingAmount += amounts.total;
    await balanceVendor.save();
    response.json({ success: true, data: purchase });
  } catch (error) { next(error); }
});

router.delete("/:id", async (request, response, next) => {
  try {
    const purchase = await Purchase.findById(request.params.id);
    if (!purchase) return response.status(404).json({ success: false, message: "Purchase entry not found" });
    const assignedLocation = await assignedLocationFor(request);
    if (assignedLocation && !purchaseBelongsToLocation(purchase, assignedLocation)) return response.status(404).json({ success: false, message: "Purchase entry not found at your assigned location." });
    const defaultLocation = assignedLocation?.isDefault ? assignedLocation : await StoreLocation.findOne({ isDefault: true }).select("_id").lean();
    const purchaseLocationId = purchase.location || defaultLocation?._id;
    const product = await Product.findById(purchase.product);
    const vendor = await Vendor.findById(purchase.vendor);
    if (product) {
      const purchasedQuantity = Number(purchase.quantity) + Number(purchase.freeQuantity || 0);
      const remainingQuantity = Math.min(purchasedQuantity, Math.max(0, Number(purchase.remainingQuantity ?? purchasedQuantity)));
      await changeProductStockAtLocation(product, purchaseLocationId, -remainingQuantity);
      updateVariantStock(product, purchase.variant, purchaseLocationId, -remainingQuantity);
      await product.save();
    }
    if (vendor) { vendor.pendingAmount = Math.max(0, vendor.pendingAmount - purchase.total); await vendor.save(); }
    await purchase.deleteOne();
    response.json({ success: true, message: "Purchase entry deleted" });
  } catch (error) { next(error); }
});

module.exports = router;
