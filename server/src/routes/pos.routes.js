const crypto = require("crypto");
const express = require("express");
const { z } = require("zod");

const PosSale = require("../models/PosSale");
const Product = require("../models/Product");
const StoreLocation = require("../models/StoreLocation");

const router = express.Router();
const saleSchema = z.object({
  customerName: z.string().trim().max(120).optional().default("Walk-in Customer"),
  locationId: z.string().regex(/^[a-f\d]{24}$/i),
  paymentMode: z.enum(["Cash", "UPI", "Card", "Credit", "Cheque"]),
  promotionDiscount: z.coerce.number().min(0).default(0),
  items: z.array(z.object({
    productId: z.string().regex(/^[a-f\d]{24}$/i),
    quantity: z.coerce.number().int().positive(),
    freeQuantity: z.coerce.number().int().min(0).default(0),
    discount: z.coerce.number().min(0).default(0),
  })).min(1).max(100),
});

router.get("/sales", async (request, response, next) => {
  try {
    const sales = await PosSale.find().populate("location", "name city").sort({ createdAt: -1 }).limit(100).lean();
    response.json({ success: true, data: sales });
  } catch (error) { next(error); }
});

router.post("/sales", async (request, response, next) => {
  try {
    const parsed = saleSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ success: false, message: "Check the invoice details and product quantities." });
    const data = parsed.data;
    const location = await StoreLocation.findOne({ _id: data.locationId, active: true }).select("_id name isDefault").lean();
    if (!location) return response.status(400).json({ success: false, message: "Select an active store location." });

    const productIds = [...new Set(data.items.map((item) => item.productId))];
    const products = await Product.find({ _id: { $in: productIds }, status: "Published" }).select("_id name unit price stock locationStock");
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));
    if (productMap.size !== productIds.length) return response.status(400).json({ success: false, message: "One or more products are unavailable for sale." });

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
      const gross = Number(product.price) * item.quantity;
      if (item.discount > gross) throw Object.assign(new Error(`Discount exceeds the value of ${product.name}.`), { statusCode: 400 });
      subtotal += gross;
      itemDiscount += item.discount;
      return {
        product: product._id,
        productName: product.name,
        unit: product.unit || "unit",
        unitPrice: Number(product.price),
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
      customerName: data.customerName || "Walk-in Customer",
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
    const rollbackStock = async () => {
      if (!stockChanged.length) return;
      await Product.bulkWrite(stockChanged.map(({ productId, quantity }) => ({
        updateOne: {
          filter: { _id: productId, locationStock: { $elemMatch: { location: location._id } } },
          update: { $inc: { stock: quantity, "locationStock.$.quantity": quantity } },
        },
      })));
    };
    try {
      for (const [productId, requiredStock] of quantitiesByProduct) {
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: productId, stock: { $gte: requiredStock }, locationStock: { $elemMatch: { location: location._id, quantity: { $gte: requiredStock } } } },
          { $inc: { stock: -requiredStock, "locationStock.$.quantity": -requiredStock } },
          { new: true },
        );
        if (!updatedProduct) {
          await rollbackStock();
          await PosSale.findByIdAndDelete(sale._id);
          return response.status(409).json({ success: false, message: "Stock changed while completing the sale. Review quantities and try again." });
        }
        stockChanged.push({ productId, quantity: requiredStock });
      }
    } catch (error) {
      await rollbackStock();
      await PosSale.findByIdAndDelete(sale._id);
      throw error;
    }

    await sale.populate("location", "name city");
    response.status(201).json({ success: true, data: sale });
  } catch (error) { next(error); }
});

module.exports = router;