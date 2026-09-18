const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const sharp = require("sharp");

const Product = require("../models/Product");
const StoreSettings = require("../models/StoreSettings");
const Offer = require("../models/Offer");
const { calculateOfferDiscount } = require("../utils/offerPricing");

const defaultTestimonials = [
  { name: "10 minute grocery now", message: "Get your essentials delivered quickly from stores near you." },
  { name: "Best prices & offers", message: "Great value, honest prices and offers you can count on." },
  { name: "Wide assortment", message: "Explore medicines, personal care, wellness and more." },
  { name: "Genuine products", message: "Every order is packed with care and delivered with confidence." },
];
const defaultHeroSlides = [
  { id: 1, eyebrow: "Fresh care for every day", title: "Good health starts with better choices.", description: "Quality medicines, wellness essentials and personal care delivered to your doorstep.", button: "Shop now", to: "/products", image: "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=1400&q=85" },
  { id: 2, eyebrow: "Everything in one place", title: "Your everyday wellness, made simple.", description: "Everything you need for your health and wellness in one place.", button: "Explore Products", to: "/products", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80" },
  { id: 3, eyebrow: "Small steps, big difference", title: "Feel your best, every single day.", description: "Discover our collection of wellness and personal care products.", button: "View Collection", to: "/products", image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=80" },
];

const router = express.Router();
const imageSearchUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const imageSignature = async (buffer) => {
  const { data, info } = await sharp(buffer).resize(1, 1).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return [data[0] / 255, data[1] / 255, data[2] / 255, info.channels];
};

router.get("/products", async (request, response, next) => {
  try {
    const products = await Product.find({ status: "Published" }).sort({ createdAt: -1 }).lean();
    products.forEach((product) => { product.images = product.images?.length ? product.images : product.image ? [product.image] : []; });
    response.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

router.post("/image-search", imageSearchUpload.single("image"), async (request, response, next) => {
  try {
    if (!request.file) return response.status(400).json({ success: false, message: "Please upload an image." });
    const target = await imageSignature(request.file.buffer);
    const products = await Product.find({ status: "Published" }).lean();
    const ranked = [];
    for (const product of products) {
      const image = product.images?.[0] || product.image;
      if (!image) continue;
      try {
        const signature = await imageSignature(fs.readFileSync(path.join(__dirname, "../../", image.replace(/^\//, ""))));
        const distance = Math.sqrt(signature.slice(0, 3).reduce((sum, value, index) => sum + (value - target[index]) ** 2, 0));
        ranked.push({ product, distance });
      } catch { /* Ignore missing or unsupported catalog images. */ }
    }
    response.json({ success: true, data: ranked.sort((first, second) => first.distance - second.distance).slice(0, 12).map(({ product }) => product) });
  } catch (error) { next(error); }
});

router.get("/store", async (request, response, next) => {
  try {
    const settings = await StoreSettings.findOne({ key: "default" }).lean();
    const payload = settings || {
      name: "My Medical Store",
      tagline: "Your Health, Our Priority",
      theme: "teal",
      logo: "",
      deliveryFee: 49,
      freeDeliveryAbove: 999,
    };

    response.json({
      success: true,
      data: {
        ...payload,
        testimonials: payload.testimonials?.length === 4 ? payload.testimonials : defaultTestimonials,
        heroSlides: payload.heroSlides?.length === 3 ? payload.heroSlides : defaultHeroSlides,
        deliveryFee: Number(payload.deliveryFee ?? 49),
        freeDeliveryAbove: Number(payload.freeDeliveryAbove ?? 999),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/offers", async (request, response, next) => {
  try { const offers = await Offer.find({ status: "Active", startsAt: { $lte: new Date() }, endsAt: { $gte: new Date() } }).sort({ createdAt: -1 }); response.json({ success: true, data: offers }); } catch (error) { next(error); }
});

router.get("/offers/validate", async (request, response, next) => {
  try {
    const code = String(request.query.code || "").trim().toUpperCase();
    const subtotal = Number(request.query.subtotal);
    if (!code || !Number.isFinite(subtotal) || subtotal < 0) {
      return response.status(400).json({ success: false, message: "Enter a valid promo code." });
    }
    const offer = await Offer.findOne({ code, status: "Active", startsAt: { $lte: new Date() }, endsAt: { $gte: new Date() } }).lean();
    if (!offer) return response.status(404).json({ success: false, message: "This promo code is invalid or expired." });
    if (subtotal < offer.minOrder) return response.status(400).json({ success: false, message: `Add ₹${offer.minOrder - subtotal} more to use this offer.` });
    let items = [];
    if (request.query.items) {
      try { items = JSON.parse(request.query.items); } catch { return response.status(400).json({ success: false, message: "Cart items are invalid." }); }
    }
    const cartItems = Array.isArray(items) ? items : [];
    let pricingItems = cartItems;
    let freeProduct = null;
    let freeQuantity = 0;
    if (offer.offerType === "buy_product_get_product" && offer.freeProduct && !cartItems.some((item) => String(item.id) === String(offer.freeProduct))) {
      const buyItem = cartItems.find((item) => String(item.id) === String(offer.buyProduct));
      const eligibleSets = Math.floor(Number(buyItem?.quantity || 0) / Math.max(1, Number(offer.buyQuantity) || 1));
      freeQuantity = eligibleSets * Math.max(1, Number(offer.freeQuantity) || 1);
      if (freeQuantity > 0) {
        freeProduct = await Product.findOne({ _id: offer.freeProduct, status: "Published" }).select("_id name brand category price originalPrice discount stock rating reviews image images").lean();
        if (!freeProduct || Number(freeProduct.stock) < freeQuantity) return response.status(400).json({ success: false, message: "The free product is out of stock." });
        pricingItems = [...cartItems, { id: freeProduct._id, price: freeProduct.price, quantity: freeQuantity }];
      }
    }
    const discountAmount = calculateOfferDiscount(offer, pricingItems, subtotal);
    if (offer.offerType !== "discount" && discountAmount <= 0) return response.status(400).json({ success: false, message: "Add the qualifying products and quantities to use this offer." });
    response.json({ success: true, data: { code: offer.code, title: offer.title, offerType: offer.offerType, discountType: offer.discountType, discountValue: offer.discountValue, discountAmount, minOrder: offer.minOrder, endsAt: offer.endsAt, freeProduct, freeQuantity } });
  } catch (error) { next(error); }
});

module.exports = router;