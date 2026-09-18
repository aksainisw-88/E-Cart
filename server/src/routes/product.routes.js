const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { z } = require("zod");

const Product = require("../models/Product");

const uploadDirectory = path.join(__dirname, "../../uploads/products");
fs.mkdirSync(uploadDirectory, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (request, file, callback) => callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});
const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (request, file, callback) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      return callback(new Error("Only JPG, PNG, WEBP, and GIF images are supported."));
    }
    return callback(null, true);
  },
});
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const productSchema = z.object({
  name: z.string().trim().min(2),
  brand: z.string().trim().max(100).optional().default(""),
  category: z.string().trim().min(2),
  price: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0).optional().default(0),
  originalPrice: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).max(100).default(0),
  stock: z.coerce.number().int().min(0),
  rating: z.coerce.number().min(0).max(5).default(0),
  reviews: z.coerce.number().int().min(0).default(0),
  status: z.enum(["Published", "Draft"]).default("Published"),
  description: z.string().optional().default(""),
});

const router = express.Router();
const uploadImage = (request, response, next) => {
  imageUpload.array("images", 6)(request, response, (error) => {
    if (!error) return next();
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Image must be smaller than 5 MB."
      : error.message || "Unable to upload image.";
    return response.status(400).json({ success: false, message });
  });
};

router.get("/", async (request, response, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    response.json({ success: true, data: products });
  } catch (error) { next(error); }
});

router.post("/", uploadImage, async (request, response, next) => {
  try {
    const data = productSchema.parse(request.body);
    const images = (request.files || []).map((file) => `/uploads/products/${file.filename}`);
    const product = await Product.create({ ...data, image: images[0] || "", images });
    response.status(201).json({ success: true, data: product });
  } catch (error) { next(error); }
});

router.put("/:id", uploadImage, async (request, response, next) => {
  try {
    const data = productSchema.partial().parse(request.body);
    const images = (request.files || []).map((file) => `/uploads/products/${file.filename}`);
    if (images.length) { data.image = images[0]; data.images = images; }
    const product = await Product.findByIdAndUpdate(request.params.id, data, { new: true, runValidators: true });
    if (!product) return response.status(404).json({ success: false, message: "Product not found" });
    response.json({ success: true, data: product });
  } catch (error) { next(error); }
});

router.delete("/:id", async (request, response, next) => {
  try {
    const product = await Product.findByIdAndDelete(request.params.id);
    if (!product) return response.status(404).json({ success: false, message: "Product not found" });
    response.json({ success: true, message: "Product deleted" });
  } catch (error) { next(error); }
});

router.post("/import", csvUpload.single("file"), async (request, response, next) => {
  try {
    if (!request.file) return response.status(400).json({ success: false, message: "CSV file is required" });
    const rows = parse(request.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
    const products = rows.map((row) => productSchema.parse(row));
    const inserted = await Product.insertMany(products);
    response.status(201).json({ success: true, imported: inserted.length, data: inserted });
  } catch (error) { next(error); }
});

module.exports = router;