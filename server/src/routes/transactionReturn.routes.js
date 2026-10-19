const crypto = require("crypto");
const express = require("express");
const { z } = require("zod");
const PosSale = require("../models/PosSale");
const Product = require("../models/Product");
const Purchase = require("../models/Purchase");
const TransactionReturn = require("../models/TransactionReturn");
const Vendor = require("../models/Vendor");

const router = express.Router();
const entryTypes = ["Sales Return", "Replacement", "Purchase Return"];
const listSchema = z.object({ type: z.enum(entryTypes) });
const createSchema = z.object({
  type: z.enum(entryTypes),
  sourceEntryId: z.string().trim().min(1).max(120),
  invoiceDate: z.coerce.date(),
  items: z.array(z.object({
    sourceItemIndex: z.coerce.number().int().min(0).optional(),
    purchaseId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    quantity: z.coerce.number().int().positive(),
  })).min(1).max(100),
});

const entryNumber = (type) => `${type === "Purchase Return" ? "PR" : type === "Replacement" ? "REP" : "SR"}-${new Date().getFullYear()}-${crypto.randomInt(100000, 1000000)}`;
const purchaseAvailable = (purchase) => Number(purchase.remainingQuantity ?? (Number(purchase.quantity || 0) + Number(purchase.freeQuantity || 0)));
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const adjustProductStock = async (productId, locationId, variantName, delta) => {
  const product = await Product.findById(productId);
  if (!product) throw Object.assign(new Error("A product on this return no longer exists."), { statusCode: 409 });
  const amount = Math.abs(delta);
  let locationEntry = null;
  if (locationId) {
    product.locationStock ||= [];
    if (!product.locationStock.length && Number(product.stock) > 0) {
      product.locationStock.push({ location: locationId, quantity: Number(product.stock) });
    }
    locationEntry = product.locationStock.find((stock) => stock.location?.toString() === locationId.toString());
    if (!locationEntry && delta < 0) throw Object.assign(new Error(`${product.name} has no available stock at the original store location.`), { statusCode: 409 });
    if (locationEntry && delta < 0 && Number(locationEntry.quantity) < amount) {
      throw Object.assign(new Error(`${product.name} has only ${Number(locationEntry.quantity) || 0} available at the original store location.`), { statusCode: 409 });
    }
  } else if (delta < 0 && Number(product.stock) < amount) {
    throw Object.assign(new Error(`${product.name} does not have enough stock for this replacement.`), { statusCode: 409 });
  }

  let variantEntry = null;
  if (variantName) {
    const variant = product.variants.find((item) => item.name === variantName);
    if (!variant) throw Object.assign(new Error(`Variant ${variantName} is no longer available for ${product.name}.`), { statusCode: 409 });
    variant.locationStock ||= [];
    variantEntry = locationId
      ? variant.locationStock.find((stock) => stock.location?.toString() === locationId.toString())
      : null;
    if (locationId && !variantEntry && delta < 0) throw Object.assign(new Error(`Variant ${variantName} has no stock at the original store location.`), { statusCode: 409 });
    if (variantEntry && delta < 0 && Number(variantEntry.quantity) < amount) {
      throw Object.assign(new Error(`Variant ${variantName} does not have enough stock for this replacement.`), { statusCode: 409 });
    }
  }

  if (locationId) {
    if (locationEntry) locationEntry.quantity = Math.max(0, Number(locationEntry.quantity || 0) + delta);
    else product.locationStock.push({ location: locationId, quantity: delta });
    product.stock = product.locationStock.reduce((total, stock) => total + (Number(stock.quantity) || 0), 0);
    if (variantName) {
      const variant = product.variants.find((item) => item.name === variantName);
      if (variantEntry) variantEntry.quantity = Math.max(0, Number(variantEntry.quantity || 0) + delta);
      else variant.locationStock.push({ location: locationId, quantity: delta });
    }
  } else {
    product.stock = Math.max(0, Number(product.stock || 0) + delta);
  }
  await product.save();
};

const adjustPurchaseQuantity = async (purchaseId, delta) => {
  const purchase = await Purchase.findById(purchaseId);
  if (!purchase) throw Object.assign(new Error("A purchase batch on this entry no longer exists."), { statusCode: 409 });
  if (purchase.remainingQuantity === undefined || purchase.remainingQuantity === null) {
    purchase.remainingQuantity = Number(purchase.quantity || 0) + Number(purchase.freeQuantity || 0);
    await purchase.save();
  }
  const amount = Math.abs(delta);
  const filter = delta < 0 ? { _id: purchaseId, remainingQuantity: { $gte: amount } } : { _id: purchaseId };
  const updated = await Purchase.findOneAndUpdate(filter, { $inc: { remainingQuantity: delta } }, { new: true });
  if (!updated) throw Object.assign(new Error(`${purchase.batchNumber || "Selected batch"} does not have enough remaining stock.`), { statusCode: 409 });
  return updated;
};

const findReplacementBatches = async (productId, locationId, variant, quantity) => {
  const locationMatch = locationId ? { location: { $in: [locationId, null] } } : {};
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const expiryMatch = { $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gte: today } }] };
  const filter = { product: productId, variant: variant || "", ...locationMatch };
  await Purchase.updateMany(
    { ...filter, remainingQuantity: { $exists: false } },
    [{ $set: { remainingQuantity: { $add: [{ $ifNull: ["$quantity", 0] }, { $ifNull: ["$freeQuantity", 0] }] } } }],
  );
  const batches = await Purchase.find({ ...filter, remainingQuantity: { $gt: 0 }, ...expiryMatch }).sort({ expiryDate: 1, purchaseDate: 1 }).lean();
  const hasAnyBatch = await Purchase.exists(filter);
  let remaining = quantity;
  const selected = [];
  for (const batch of batches) {
    const take = Math.min(remaining, Number(batch.remainingQuantity) || 0);
    if (take > 0) selected.push({ purchaseId: batch._id, quantity: take });
    remaining -= take;
    if (remaining <= 0) break;
  }
  if (hasAnyBatch && remaining > 0) throw Object.assign(new Error(`${batches[0]?.productName || "Available batches"} does not have enough batch stock for this replacement.`), { statusCode: 409 });
  return selected;
};

router.get("/sources", async (request, response, next) => {
  try {
    const parsed = listSchema.safeParse(request.query);
    if (!parsed.success) return response.status(400).json({ success: false, message: "Choose a valid return module." });
    if (parsed.data.type === "Purchase Return") {
      const purchases = await Purchase.find().populate("vendor", "name").populate("location", "name").sort({ purchaseDate: -1, createdAt: -1 }).limit(500).lean();
      const groups = new Map();
      purchases.forEach((purchase) => {
        const vendorInvoiceNumber = String(purchase.vendorInvoiceNumber || "").trim();
        const invoiceDate = new Date(purchase.purchaseDate || purchase.createdAt).toISOString().slice(0, 10);
        const legacyGroup = vendorInvoiceNumber
          ? `legacy-group:${purchase.vendor?._id || purchase.vendor}:${vendorInvoiceNumber.toLocaleLowerCase()}:${invoiceDate}:${purchase.location?._id || purchase.location || ""}`
          : `legacy-entry:${purchase._id}`;
        const groupKey = purchase.invoiceGroupId || legacyGroup;
        if (!groups.has(groupKey)) groups.set(groupKey, {
          id: purchase.invoiceGroupId || purchase._id.toString(),
          entryNumber: purchase.vendorInvoiceNumber || purchase.invoiceNumber,
          invoiceDate: purchase.purchaseDate,
          partyName: purchase.vendor?.name || "Vendor",
          location: purchase.location,
          items: [],
        });
        groups.get(groupKey).items.push({
          purchaseId: purchase._id,
          productName: purchase.productName,
          productId: purchase.product?._id || purchase.product,
          variant: purchase.variant || "",
          batchNumber: purchase.batchNumber || "",
          expiryDate: purchase.expiryDate,
          mrp: Number(purchase.mrp) || 0,
          rate: Number(purchase.rate ?? purchase.unitCost) || 0,
          availableQuantity: purchaseAvailable(purchase),
          amount: Number(purchase.amount) || 0,
          location: purchase.location,
        });
      });
      return response.json({ success: true, data: [...groups.values()] });
    }

    const sales = await PosSale.find()
      .populate("customer", "name")
      .populate("location", "name")
      .populate("items.product", "name")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    const saleIds = sales.map((sale) => sale._id);
    const previousReturns = saleIds.length ? await TransactionReturn.find({ sourceSale: { $in: saleIds }, type: { $in: ["Sales Return", "Replacement"] } }).select("sourceSale items.sourceItemIndex items.quantity").lean() : [];
    const returnedByLine = new Map();
    previousReturns.forEach((entry) => entry.items.forEach((item) => {
      const key = `${entry.sourceSale}:${item.sourceItemIndex}`;
      returnedByLine.set(key, (returnedByLine.get(key) || 0) + Number(item.quantity || 0));
    }));
    response.json({
      success: true,
      data: sales.map((sale) => ({
        id: sale._id,
        entryNumber: sale.invoiceNumber,
        invoiceDate: sale.createdAt,
        partyName: sale.customer?.name || sale.customerName || "Walk-in Customer",
        location: sale.location,
        total: Number(sale.total) || 0,
        items: (sale.items || []).map((item, sourceItemIndex) => ({
          sourceItemIndex,
          productId: item.product?._id || item.product,
          productName: item.productName || item.product?.name || "Product",
          variant: item.variant || "",
          batchNumber: item.batchNumber || "",
          expiryDate: item.expiryDate,
          purchaseId: item.purchase,
          mrp: Number(item.mrp) || 0,
          rate: Number(item.unitPrice) || 0,
          quantity: Number(item.quantity || 0) + Number(item.freeQuantity || 0),
          availableQuantity: Math.max(0, Number(item.quantity || 0) + Number(item.freeQuantity || 0) - (returnedByLine.get(`${sale._id}:${sourceItemIndex}`) || 0)),
          amount: Number(item.amount) || 0,
        })),
      })),
    });
  } catch (error) { next(error); }
});

router.get("/", async (request, response, next) => {
  try {
    const parsed = listSchema.safeParse(request.query);
    if (!parsed.success) return response.status(400).json({ success: false, message: "Choose a valid return module." });
    const entries = await TransactionReturn.find({ type: parsed.data.type })
      .populate("location", "name")
      .sort({ invoiceDate: -1, createdAt: -1 })
      .limit(500)
      .lean();
    response.json({ success: true, data: entries });
  } catch (error) { next(error); }
});

router.post("/", async (request, response, next) => {
  try {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: "Enter an invoice date and at least one valid return quantity." });
    const data = parsed.data;
    if (new Set(data.items.map((item) => item.sourceItemIndex ?? item.purchaseId)).size !== data.items.length) {
      return response.status(400).json({ success: false, message: "A source invoice line can only be entered once per return." });
    }

    const changes = [];
    let vendor;
    let vendorBalanceChange = 0;
    let returnData;
    try {
      if (data.type === "Purchase Return") {
        let purchases;
        if (/^[a-f\d]{24}$/i.test(data.sourceEntryId)) {
          const source = await Purchase.findById(data.sourceEntryId).populate("vendor", "name pendingAmount").populate("location", "name");
          if (!source) return response.status(404).json({ success: false, message: "The selected purchase entry was not found." });
          if (source.invoiceGroupId) {
            purchases = await Purchase.find({ invoiceGroupId: source.invoiceGroupId }).populate("vendor", "name pendingAmount").populate("location", "name");
          } else if (String(source.vendorInvoiceNumber || "").trim()) {
            const dayStart = new Date(source.purchaseDate || source.createdAt);
            dayStart.setUTCHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
            purchases = await Purchase.find({
              vendor: source.vendor?._id,
              vendorInvoiceNumber: { $regex: `^${escapeRegExp(String(source.vendorInvoiceNumber).trim())}$`, $options: "i" },
              purchaseDate: { $gte: dayStart, $lt: dayEnd },
              location: source.location?._id || null,
            }).populate("vendor", "name pendingAmount").populate("location", "name");
          } else {
            purchases = [source];
          }
        } else {
          purchases = await Purchase.find({ invoiceGroupId: data.sourceEntryId }).populate("vendor", "name pendingAmount").populate("location", "name");
        }
        if (!purchases.length) return response.status(404).json({ success: false, message: "The selected purchase entry was not found." });
        const purchaseMap = new Map(purchases.map((purchase) => [purchase._id.toString(), purchase]));
        const items = [];
        for (const selected of data.items) {
          const purchase = purchaseMap.get(selected.purchaseId);
          if (!purchase) return response.status(400).json({ success: false, message: "A selected item does not belong to this purchase entry." });
          if (selected.quantity > purchaseAvailable(purchase)) return response.status(409).json({ success: false, message: `${purchase.productName} has only ${purchaseAvailable(purchase)} remaining unit(s) to return.` });
          const unitRate = Number(purchase.rate ?? purchase.unitCost) || 0;
          items.push({
            purchase: purchase._id,
            product: purchase.product,
            productName: purchase.productName,
            variant: purchase.variant || "",
            batchNumber: purchase.batchNumber || "",
            expiryDate: purchase.expiryDate,
            quantity: selected.quantity,
            unitRate,
            amount: Number((unitRate * selected.quantity).toFixed(2)),
          });
        }
        vendor = purchases[0].vendor;
        if (!vendor || purchases.some((purchase) => !purchase.vendor || purchase.vendor._id.toString() !== vendor._id.toString())) return response.status(409).json({ success: false, message: "The vendor for this purchase entry is unavailable or inconsistent." });
        const sourcePurchaseIds = purchases.map((purchase) => purchase._id);
        returnData = {
          type: data.type,
          invoiceDate: data.invoiceDate,
          sourceEntryId: data.sourceEntryId,
          sourceEntryNo: purchases[0].vendorInvoiceNumber || purchases[0].invoiceNumber,
          sourcePurchases: sourcePurchaseIds,
          originalInvoiceDate: purchases[0].purchaseDate,
          partyName: vendor.name,
          location: purchases[0].location?._id,
          items,
          total: items.reduce((sum, item) => sum + item.amount, 0),
          createdBy: request.user.id,
        };
        for (const selected of data.items) {
          const purchase = purchaseMap.get(selected.purchaseId);
          await adjustPurchaseQuantity(purchase._id, -selected.quantity);
          changes.push({ kind: "purchase", id: purchase._id, delta: selected.quantity });
          await adjustProductStock(purchase.product, purchase.location?._id, purchase.variant, -selected.quantity);
          changes.push({ kind: "product", id: purchase.product, locationId: purchase.location?._id, variant: purchase.variant, delta: selected.quantity });
        }
        vendorBalanceChange = Math.min(Number(vendor.pendingAmount) || 0, returnData.total);
        if (vendorBalanceChange > 0) {
          vendor.pendingAmount = Math.max(0, Number(vendor.pendingAmount) - vendorBalanceChange);
          await vendor.save();
          changes.push({ kind: "vendor", id: vendor._id, delta: vendorBalanceChange });
        }
      } else {
        const sale = await PosSale.findById(data.sourceEntryId).populate("customer", "name").populate("location", "name").lean();
        if (!sale) return response.status(404).json({ success: false, message: "The selected sales entry was not found." });
        const previousReturns = await TransactionReturn.find({ sourceSale: sale._id, type: { $in: ["Sales Return", "Replacement"] } }).select("items.sourceItemIndex items.quantity").lean();
        const alreadyReturned = new Map();
        previousReturns.forEach((entry) => entry.items.forEach((item) => alreadyReturned.set(item.sourceItemIndex, (alreadyReturned.get(item.sourceItemIndex) || 0) + Number(item.quantity || 0))));
        const items = [];
        for (const selected of data.items) {
          const sourceItem = sale.items[selected.sourceItemIndex];
          if (!sourceItem) return response.status(400).json({ success: false, message: "A selected item does not belong to this sales entry." });
          const available = Number(sourceItem.quantity || 0) + Number(sourceItem.freeQuantity || 0) - (alreadyReturned.get(selected.sourceItemIndex) || 0);
          if (selected.quantity > available) return response.status(409).json({ success: false, message: `${sourceItem.productName} has only ${Math.max(0, available)} unit(s) available to return.` });
          const unitRate = Number(sourceItem.unitPrice) || 0;
          const soldQuantity = Number(sourceItem.quantity || 0) + Number(sourceItem.freeQuantity || 0);
          const lineAmount = soldQuantity > 0 ? Number(sourceItem.amount || 0) / soldQuantity * selected.quantity : unitRate * selected.quantity;
          items.push({
            sourceItemIndex: selected.sourceItemIndex,
            purchase: sourceItem.purchase,
            product: sourceItem.product,
            productName: sourceItem.productName,
            variant: sourceItem.variant || "",
            batchNumber: sourceItem.batchNumber || "",
            expiryDate: sourceItem.expiryDate,
            quantity: selected.quantity,
            unitRate,
            amount: data.type === "Replacement" ? 0 : Number(lineAmount.toFixed(2)),
          });
        }
        returnData = {
          type: data.type,
          invoiceDate: data.invoiceDate,
          sourceEntryId: sale._id.toString(),
          sourceEntryNo: sale.invoiceNumber,
          sourceSale: sale._id,
          originalInvoiceDate: sale.createdAt,
          partyName: sale.customer?.name || sale.customerName || "Walk-in Customer",
          location: sale.location?._id || sale.location,
          items,
          total: data.type === "Replacement" ? 0 : items.reduce((sum, item) => sum + item.amount, 0),
          createdBy: request.user.id,
        };

        for (const selected of data.items) {
          const sourceItem = sale.items[selected.sourceItemIndex];
          const delta = data.type === "Replacement" ? -selected.quantity : selected.quantity;
          await adjustProductStock(sourceItem.product, sale.location?._id || sale.location, sourceItem.variant, delta);
          changes.push({ kind: "product", id: sourceItem.product, locationId: sale.location?._id || sale.location, variant: sourceItem.variant || "", delta: -delta });
          if (data.type === "Sales Return" && sourceItem.purchase) {
            await adjustPurchaseQuantity(sourceItem.purchase, selected.quantity);
            changes.push({ kind: "purchase", id: sourceItem.purchase, delta: -selected.quantity });
          }
          if (data.type === "Replacement") {
            const batches = await findReplacementBatches(sourceItem.product, sale.location?._id || sale.location, sourceItem.variant, selected.quantity);
            for (const batch of batches) {
              await adjustPurchaseQuantity(batch.purchaseId, -batch.quantity);
              changes.push({ kind: "purchase", id: batch.purchaseId, delta: batch.quantity });
            }
          }
        }
      }

      const entry = await TransactionReturn.create({ returnNumber: entryNumber(data.type), ...returnData });
      response.status(201).json({ success: true, data: entry });
    } catch (error) {
      for (const change of changes.reverse()) {
        try {
          if (change.kind === "purchase") await adjustPurchaseQuantity(change.id, change.delta);
          if (change.kind === "product") await adjustProductStock(change.id, change.locationId, change.variant, change.delta);
          if (change.kind === "vendor") await Vendor.updateOne({ _id: change.id }, { $inc: { pendingAmount: change.delta } });
        } catch (rollbackError) {
          console.error("Transaction return rollback failed:", rollbackError);
        }
      }
      if (error.statusCode) return response.status(error.statusCode).json({ success: false, message: error.message });
      throw error;
    }
  } catch (error) { next(error); }
});

module.exports = router;
