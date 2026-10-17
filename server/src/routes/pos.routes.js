const crypto = require("crypto");
const express = require("express");
const { z } = require("zod");

const PosSale = require("../models/PosSale");
const Product = require("../models/Product");
const Purchase = require("../models/Purchase");
const StoreLocation = require("../models/StoreLocation");
const User = require("../models/User");

const router = express.Router();
const saleSchema = z.object({
  customerId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  customerName: z.string().trim().max(120).optional().default("Walk-in Customer"),
  locationId: z.string().regex(/^[a-f\d]{24}$/i),
  paymentMode: z.enum(["Cash", "UPI", "Card", "Credit", "Cheque"]),
  promotionDiscount: z.coerce.number().min(0).default(0),
  items: z.array(z.object({
    productId: z.string().regex(/^[a-f\d]{24}$/i),
    purchaseId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    rate: z.coerce.number().min(0).optional(),
    quantity: z.coerce.number().int().positive(),
    freeQuantity: z.coerce.number().int().min(0).default(0),
    discount: z.coerce.number().min(0).default(0),
  })).min(1).max(100),
});

router.get("/batches", async (request, response, next) => {
  try {
    const query = z.object({
      productId: z.string().regex(/^[a-f\d]{24}$/i),
      locationId: z.string().regex(/^[a-f\d]{24}$/i),
    }).safeParse(request.query);
    if (!query.success) return response.status(400).json({ success: false, message: "Select a product and store location." });
    const { productId, locationId } = query.data;
    const location = await StoreLocation.findOne({ _id: locationId, active: true }).select("_id isDefault").lean();
    if (!location) return response.status(400).json({ success: false, message: "Select an active store location." });
    const purchaseLocationFilter = location.isDefault
      ? { $or: [{ location: location._id }, { location: null }] }
      : { location: location._id };
    await Purchase.updateMany(
      { product: productId, ...purchaseLocationFilter, remainingQuantity: { $exists: false } },
      [{ $set: { remainingQuantity: { $add: [{ $ifNull: ["$quantity", 0] }, { $ifNull: ["$freeQuantity", 0] }] } } }],
      { updatePipeline: true },
    );
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const batches = await Purchase.find({
      product: productId,
      ...purchaseLocationFilter,
      remainingQuantity: { $gt: 0 },
      $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gte: today } }],
    }).select("invoiceNumber batchNumber expiryDate mrp rate remainingQuantity").sort({ expiryDate: 1, purchaseDate: 1 }).lean();
    response.json({ success: true, data: batches });
  } catch (error) { next(error); }
});

router.get("/sales", async (request, response, next) => {
  try {
    const sales = await PosSale.find().populate("location", "name city").populate("customer", "name email phone customerSource").sort({ createdAt: -1 }).limit(100).lean();
    response.json({ success: true, data: sales });
  } catch (error) { next(error); }
});

router.post("/sales", async (request, response, next) => {
  try {
    const parsed = saleSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: "Check the invoice details and product quantities." });
    const data = parsed.data;
    const customer = data.customerId ? await User.findOne({ _id: data.customerId, role: "customer", status: "Active" }).select("name customerSource").lean() : null;
    if (data.customerId && !customer) return response.status(400).json({ success: false, message: "Select an active customer." });
    const location = await StoreLocation.findOne({ _id: data.locationId, active: true }).select("_id name isDefault").lean();
    if (!location) return response.status(400).json({ success: false, message: "Select an active store location." });

    const productIds = [...new Set(data.items.map((item) => item.productId))];
    const products = await Product.find({ _id: { $in: productIds }, status: "Published" }).select("_id name unit price stock locationStock");
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));
    if (productMap.size !== productIds.length) return response.status(400).json({ success: false, message: "One or more products are unavailable for sale." });
    const purchaseLocationFilter = location.isDefault
      ? { $or: [{ location: location._id }, { location: null }] }
      : { location: location._id };

    await Purchase.updateMany(
      { product: { $in: productIds }, ...purchaseLocationFilter, remainingQuantity: { $exists: false } },
      [{ $set: { remainingQuantity: { $add: [{ $ifNull: ["$quantity", 0] }, { $ifNull: ["$freeQuantity", 0] }] } } }],
      { updatePipeline: true },
    );
    const purchaseIds = [...new Set(data.items.map((item) => item.purchaseId).filter(Boolean))];
    const purchases = purchaseIds.length ? await Purchase.find({ _id: { $in: purchaseIds } }).select("product location batchNumber expiryDate mrp rate remainingQuantity") : [];
    const purchaseMap = new Map(purchases.map((purchase) => [purchase._id.toString(), purchase]));
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    for (const item of data.items) {
      const product = productMap.get(item.productId);
      const productHasBatch = await Purchase.exists({ product: product._id, ...purchaseLocationFilter });
      if (!item.purchaseId) {
        if (productHasBatch) return response.status(400).json({ success: false, message: `Select an available batch for ${product.name}.` });
        continue;
      }
      const purchase = purchaseMap.get(item.purchaseId);
      const batchLocationMatches = purchase && (purchase.location ? purchase.location.equals(location._id) : location.isDefault);
      if (!purchase || !purchase.product.equals(product._id) || !batchLocationMatches) {
        return response.status(400).json({ success: false, message: `The selected batch is not available for ${product.name} at ${location.name}.` });
      }
      if (purchase.expiryDate && purchase.expiryDate < today) return response.status(400).json({ success: false, message: `The selected batch of ${product.name} has expired.` });
      if (purchase.remainingQuantity < item.quantity + item.freeQuantity) {
        return response.status(409).json({ success: false, message: `The selected batch of ${product.name} does not have enough stock.` });
      }
    }

    for (const product of products) {
      if (!product.locationStock.length && location.isDefault && product.stock > 0) {
        product.locationStock.push({ location: location._id, quantity: product.stock });
        await product.save();
      }
    }

    let subtotal = 0;
    let itemDiscount = 0;
    const items = data.items.map((item) => {
      const product = productMap.get(item.productId);
      const rate = item.rate ?? Number(product.price);
      const gross = rate * item.quantity;
      if (item.discount > gross) throw Object.assign(new Error(`Discount exceeds the value of ${product.name}.`), { statusCode: 400 });
      subtotal += gross;
      itemDiscount += item.discount;
      const purchase = item.purchaseId ? purchaseMap.get(item.purchaseId) : null;
      return {
        product: product._id,
        purchase: purchase?._id,
        productName: product.name,
        batchNumber: purchase?.batchNumber || "",
        expiryDate: purchase?.expiryDate,
        mrp: Number(purchase?.mrp) || 0,
        unit: product.unit || "unit",
        unitPrice: rate,
        quantity: item.quantity,
        freeQuantity: item.freeQuantity,
        discount: item.discount,
        amount: Math.max(gross - item.discount, 0),
      };
    });
    if (itemDiscount + data.promotionDiscount > subtotal) {
      return response.status(400).json({ success: false, message: "Discount cannot exceed the invoice subtotal." });
    }

    for (const item of data.items) {
      const product = productMap.get(item.productId);
      const locationStock = product.locationStock.find((entry) => entry.location.equals(location._id))?.quantity || 0;
      const requiredStock = item.quantity + item.freeQuantity;
      if (locationStock < requiredStock) {
        return response.status(409).json({ success: false, message: `${product.name} has only ${locationStock} ${product.unit || "unit"} at ${location.name}.` });
      }
    }

    const discount = itemDiscount + data.promotionDiscount;
    const taxRate = 5;
    const taxableAmount = Math.max(subtotal - discount, 0);
    const tax = Number((taxableAmount * taxRate / 100).toFixed(2));
    const total = Number((taxableAmount + tax).toFixed(2));
    const invoiceNumber = `POS-${new Date().getFullYear()}-${crypto.randomInt(100000, 1000000)}`;
    const sale = await PosSale.create({
      invoiceNumber,
      customer: customer?._id,
      customerName: customer?.name || data.customerName || "Walk-in Customer",
      customerSource: customer?.customerSource || (customer ? "Online" : "Walk-in"),
      location: location._id,
      items,
      subtotal,
      itemDiscount,
      promotionDiscount: data.promotionDiscount,
      discount,
      taxRate,
      tax,
      total,
      paymentMode: data.paymentMode,
      paymentStatus: data.paymentMode === "Credit" ? "Pending" : "Paid",
    });

    const quantitiesByProduct = new Map();
    data.items.forEach((item) => quantitiesByProduct.set(item.productId, (quantitiesByProduct.get(item.productId) || 0) + item.quantity + item.freeQuantity));
    const stockChanged = [];
    const batchStockChanged = [];
    const rollbackStock = async () => {
      if (!stockChanged.length) return;
      await Product.bulkWrite(stockChanged.map(({ productId, quantity }) => ({
        updateOne: {
          filter: { _id: productId, locationStock: { $elemMatch: { location: location._id } } },
          update: { $inc: { stock: quantity, "locationStock.$.quantity": quantity } },
        },
      })));
    };
    const rollbackBatchStock = async () => {
      if (!batchStockChanged.length) return;
      await Purchase.bulkWrite(batchStockChanged.map(({ purchaseId, quantity }) => ({
        updateOne: { filter: { _id: purchaseId }, update: { $inc: { remainingQuantity: quantity } } },
      })));
    };
    try {
      for (const item of data.items) {
        if (!item.purchaseId) continue;
        const requiredQuantity = item.quantity + item.freeQuantity;
        const purchase = purchaseMap.get(item.purchaseId);
        const updatedPurchase = await Purchase.findOneAndUpdate(
          { _id: item.purchaseId, product: item.productId, location: purchase.location || null, remainingQuantity: { $gte: requiredQuantity } },
          { $inc: { remainingQuantity: -requiredQuantity } },
          { new: true },
        );
        if (!updatedPurchase) {
          await rollbackBatchStock();
          await rollbackStock();
          await PosSale.findByIdAndDelete(sale._id);
          return response.status(409).json({ success: false, message: "Batch stock changed while completing the sale. Review the selected batch and try again." });
        }
        batchStockChanged.push({ purchaseId: item.purchaseId, quantity: requiredQuantity });
      }
      for (const [productId, requiredStock] of quantitiesByProduct) {
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: productId, stock: { $gte: requiredStock }, locationStock: { $elemMatch: { location: location._id, quantity: { $gte: requiredStock } } } },
          { $inc: { stock: -requiredStock, "locationStock.$.quantity": -requiredStock } },
          { new: true },
        );
        if (!updatedProduct) {
          await rollbackBatchStock();
          await rollbackStock();
          await PosSale.findByIdAndDelete(sale._id);
          return response.status(409).json({ success: false, message: "Stock changed while completing the sale. Review quantities and try again." });
        }
        stockChanged.push({ productId, quantity: requiredStock });
      }
    } catch (error) {
      await rollbackBatchStock();
      await rollbackStock();
      await PosSale.findByIdAndDelete(sale._id);
      throw error;
    }

    await sale.populate("location", "name city");
    response.status(201).json({ success: true, data: sale });
  } catch (error) { next(error); }
});

module.exports = router;