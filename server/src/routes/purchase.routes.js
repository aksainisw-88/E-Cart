const express = require("express");
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
  vendorInvoiceNumber: z.string().trim().max(120).optional().default(""),
  referenceNumber: z.string().trim().max(120).optional().default(""),
  location: z.union([z.string().regex(/^[a-f\d]{24}$/i), z.literal("")]).optional().default(""),
  batchNumber: z.string().trim().max(100).optional().default(""),
  expiryDate: z.coerce.date().optional(),
  mrp: z.coerce.number().min(0).default(0),
  rate: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().int().positive(),
  freeQuantity: z.coerce.number().int().min(0).default(0),
  unitCost: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  purchaseDate: z.coerce.date(),
});
const adjustmentSchema = z.object({
  product: z.string().min(1),
  vendor: z.string().optional().or(z.literal("")),
  stockAdjustment: z.coerce.number().int(),
  balanceAdjustment: z.coerce.number().default(0),
  reason: z.string().trim().min(3),
  adjustmentDate: z.coerce.date(),
});

const resolveVendor = async (value) => {
  const existing = await Vendor.findById(value).catch(() => null) || await Vendor.findOne({ name: new RegExp(`^${String(value).trim()}$`, "i") });
  return existing || Vendor.create({ name: String(value).trim() });
};
const resolveProduct = async (value) => {
  const existing = await Product.findById(value).catch(() => null) || await Product.findOne({ name: new RegExp(`^${String(value).trim()}$`, "i") });
  return existing;
};
const getAmounts = (data) => {
  const rate = data.rate ?? data.unitCost;
  const taxAmount = Number((data.quantity * rate * data.taxRate / 100).toFixed(2));
  const amount = Math.max(Number((data.quantity * rate + taxAmount - data.discount).toFixed(2)), 0);
  return { rate, taxAmount, amount, total: amount };
};
const createInvoiceNumber = () => `PUR-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;

const changeProductStock = (product, locationId, quantityChange) => {
  product.stock = Math.max(0, Number(product.stock || 0) + quantityChange);
  if (!locationId) return;
  product.locationStock ||= [];
  const locationEntry = product.locationStock.find((entry) => entry.location.toString() === locationId.toString());
  if (locationEntry) locationEntry.quantity = Math.max(0, locationEntry.quantity + quantityChange);
  else if (quantityChange > 0) product.locationStock.push({ location: locationId, quantity: quantityChange });
};

const resolveActiveLocation = async (locationId) => {
  if (!locationId) return null;
  if (!/^[a-f\d]{24}$/i.test(locationId)) return null;
  return StoreLocation.findOne({ _id: locationId, active: true }).select("_id").lean();
};

const createPurchase = async (input) => {
  const data = purchaseSchema.parse(input);
  const [vendor, product] = await Promise.all([resolveVendor(data.vendor), resolveProduct(data.product)]);
  if (!product) throw new Error("Product not found. Use the product ID or exact product name.");
  const location = await resolveActiveLocation(data.location);
  if (data.location && !location) throw Object.assign(new Error("Select an active stock location."), { statusCode: 400 });
  const amounts = getAmounts(data);
  const purchase = await Purchase.create({ ...data, ...amounts, invoiceNumber: createInvoiceNumber(), vendor: vendor._id, product: product._id, location: location?._id, productName: product.name });
  changeProductStock(product, location?._id, data.quantity + data.freeQuantity);
  product.costPrice = data.unitCost;
  if (data.mrp > 0) product.originalPrice = data.mrp;
  product.vendorName = vendor.name;
  product.purchaseDate = data.purchaseDate;
  await product.save();
  vendor.pendingAmount += amounts.total;
  await vendor.save();
  return purchase.populate("vendor", "name").then((entry) => entry.populate("product", "name category price stock")).then((entry) => entry.populate("location", "name city"));
};

router.get("/", async (request, response, next) => {
  try {
    const filter = request.query.vendor ? { vendor: request.query.vendor } : {};
    const purchases = await Purchase.find(filter).populate("vendor", "name").populate("product", "name stock").populate("location", "name city").sort({ purchaseDate: -1, createdAt: -1 });
    response.json({ success: true, data: purchases });
  } catch (error) { next(error); }
});

router.get("/adjustments", async (request, response, next) => {
  try {
    const adjustments = await PurchaseAdjustment.find().populate("product", "name stock").populate("vendor", "name").sort({ adjustmentDate: -1, createdAt: -1 });
    response.json({ success: true, data: adjustments });
  } catch (error) { next(error); }
});

router.post("/", async (request, response, next) => {
  try {
    const purchase = await createPurchase(request.body);
    response.status(201).json({ success: true, data: purchase });
  } catch (error) { next(error); }
});

router.post("/adjustment", async (request, response, next) => {
  try {
    const data = adjustmentSchema.parse(request.body);
    if (!data.stockAdjustment && !data.balanceAdjustment) return response.status(400).json({ success: false, message: "Enter a stock or balance adjustment." });
    const product = await resolveProduct(data.product);
    if (!product) return response.status(404).json({ success: false, message: "Product not found." });
    if (product.stock + data.stockAdjustment < 0) return response.status(400).json({ success: false, message: "Stock adjustment cannot make stock negative." });
    const vendor = data.vendor ? await resolveVendor(data.vendor) : null;
    if (vendor && vendor.pendingAmount + data.balanceAdjustment < 0) return response.status(400).json({ success: false, message: "Balance adjustment cannot make pending amount negative." });
    const adjustment = await PurchaseAdjustment.create({ ...data, product: product._id, vendor: vendor?._id });
    product.stock += data.stockAdjustment;
    await product.save();
    if (vendor) { vendor.pendingAmount += data.balanceAdjustment; await vendor.save(); }
    response.status(201).json({ success: true, data: adjustment });
  } catch (error) { next(error); }
});

router.post("/import", csvUpload.single("file"), async (request, response, next) => {
  try {
    if (!request.file) return response.status(400).json({ success: false, message: "CSV file is required" });
    const rows = parse(request.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
    const imported = [];
    for (const row of rows) imported.push(await createPurchase({ vendor: row.vendor || row.vendorName, product: row.product || row.productName, vendorInvoiceNumber: row.vendorInvoiceNumber || row.invoiceNumber, referenceNumber: row.referenceNumber, location: row.location, batchNumber: row.batchNumber, expiryDate: row.expiryDate || undefined, mrp: row.mrp || 0, rate: row.rate || row.unitCost || row.cost, quantity: row.quantity, freeQuantity: row.freeQuantity || 0, unitCost: row.unitCost || row.cost, discount: row.discount || 0, taxRate: row.taxRate || 0, purchaseDate: row.purchaseDate || new Date().toISOString() }));
    response.status(201).json({ success: true, imported: imported.length, data: imported });
  } catch (error) { next(error); }
});

router.put("/:id", async (request, response, next) => {
  try {
    const oldPurchase = await Purchase.findById(request.params.id);
    if (!oldPurchase) return response.status(404).json({ success: false, message: "Purchase entry not found" });
    const data = purchaseSchema.parse(request.body);
    const [vendor, product] = await Promise.all([resolveVendor(data.vendor), resolveProduct(data.product)]);
    if (!product) return response.status(404).json({ success: false, message: "Product not found" });
    const location = await resolveActiveLocation(data.location);
    if (data.location && !location) return response.status(400).json({ success: false, message: "Select an active stock location." });
    const oldProduct = await Product.findById(oldPurchase.product);
    const oldVendor = await Vendor.findById(oldPurchase.vendor);
    const sameProduct = Boolean(oldProduct && oldProduct._id.equals(product._id));
    const stockProduct = sameProduct ? oldProduct : product;
    const sameProductLocation = sameProduct && oldPurchase.location?.toString() === location?._id.toString();
    const sameVendor = Boolean(oldVendor && oldVendor._id.equals(vendor._id));
    const balanceVendor = sameVendor ? oldVendor : vendor;
    if (sameProductLocation) {
      changeProductStock(stockProduct, location?._id, data.quantity + data.freeQuantity - oldPurchase.quantity - oldPurchase.freeQuantity);
    } else if (oldProduct) {
      changeProductStock(oldProduct, oldPurchase.location, -(oldPurchase.quantity + oldPurchase.freeQuantity));
    }
    if (oldVendor) oldVendor.pendingAmount = Math.max(0, oldVendor.pendingAmount - oldPurchase.total);
    if (oldProduct && !sameProduct) await oldProduct.save();
    if (oldVendor && !sameVendor) await oldVendor.save();
    const amounts = getAmounts(data);
    const purchase = await Purchase.findByIdAndUpdate(request.params.id, { ...data, ...amounts, invoiceNumber: oldPurchase.invoiceNumber, vendor: vendor._id, product: product._id, location: location?._id, productName: product.name }, { new: true, runValidators: true }).populate("vendor", "name").populate("product", "name stock").populate("location", "name city");
    if (!sameProductLocation) changeProductStock(stockProduct, location?._id, data.quantity + data.freeQuantity);
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
    const product = await Product.findById(purchase.product);
    const vendor = await Vendor.findById(purchase.vendor);
    if (product) { changeProductStock(product, purchase.location, -(purchase.quantity + purchase.freeQuantity)); await product.save(); }
    if (vendor) { vendor.pendingAmount = Math.max(0, vendor.pendingAmount - purchase.total); await vendor.save(); }
    await purchase.deleteOne();
    response.json({ success: true, message: "Purchase entry deleted" });
  } catch (error) { next(error); }
});

module.exports = router;
