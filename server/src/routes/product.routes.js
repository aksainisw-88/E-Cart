const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { z } = require("zod");

const Product = require("../models/Product");
const ProductCategory = require("../models/ProductCategory");
const builtInCategories = ["Medicines", "Health Care", "Personal Care", "Baby Care", "Medical Devices", "Wellness", "Vitamins & Supplements", "First Aid"];

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
  unit: z.string().trim().min(1).max(40).optional().default("unit"),
  category: z.string().trim().min(2),
  price: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0).optional().default(0),
  originalPrice: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).max(100).default(0),
  vendorName: z.string().trim().max(120).optional().default(""),
  purchaseDate: z.coerce.date().optional(),
  rating: z.coerce.number().min(0).max(5).default(0),
  reviews: z.coerce.number().int().min(0).default(0),
  status: z.enum(["Published", "Draft"]).default("Published"),
  description: z.string().optional().default(""),
});
const categorySchema = z.object({ name: z.string().trim().min(2).max(80), parentCategoryId: z.string().optional().nullable() });
const categoryEditSchema = z.object({ name: z.string().trim().min(2).max(80) });

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

const ensureCategories = async () => {
  await Promise.all(builtInCategories.map((name) => ProductCategory.updateOne(
    { builtInKey: name.toLocaleLowerCase() },
    { $setOnInsert: { name, normalizedName: name.toLocaleLowerCase(), builtInKey: name.toLocaleLowerCase() } },
    { upsert: true },
  )));
  const productNames = await Product.distinct("category");
  for (const name of productNames.filter(Boolean)) {
    const normalizedName = name.trim().toLocaleLowerCase();
    if (!normalizedName || await ProductCategory.exists({ normalizedName })) continue;
    try {
      await ProductCategory.create({ name: name.trim(), normalizedName, isDeleted: false });
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
};

const parentCategoryFor = async (parentCategoryId) => {
  if (!parentCategoryId) return null;
  if (!/^[a-f\d]{24}$/i.test(parentCategoryId)) return { error: "Parent category is invalid." };
  const parent = await ProductCategory.findOne({ _id: parentCategoryId, isDeleted: { $ne: true } });
  if (!parent) return { error: "Parent category not found." };
  if (parent.parentCategory) return { error: "Subcategories can only be nested one level deep." };
  return parent;
};

router.get("/categories", async (request, response, next) => {
  try {
    await ensureCategories();
    const categories = await ProductCategory.find({ isDeleted: { $ne: true } }).populate("parentCategory", "name").sort({ name: 1 }).lean();
    response.json({ success: true, data: categories });
  } catch (error) { next(error); }
});

router.post("/categories", async (request, response, next) => {
  try {
    const data = categorySchema.parse(request.body);
    const normalizedName = data.name.toLocaleLowerCase();
    const parentCategory = await parentCategoryFor(data.parentCategoryId);
    if (parentCategory?.error) return response.status(400).json({ success: false, message: parentCategory.error });
    const existingCategory = await ProductCategory.findOne({ normalizedName });
    if (existingCategory && !existingCategory.isDeleted) return response.status(409).json({ success: false, message: "This category already exists." });
    const category = existingCategory || new ProductCategory({ name: data.name, normalizedName });
    category.name = data.name;
    category.normalizedName = normalizedName;
    category.parentCategory = parentCategory?._id || null;
    category.isDeleted = false;
    await category.save();
    await category.populate("parentCategory", "name");
    response.status(201).json({ success: true, data: category });
  } catch (error) { next(error); }
});

router.put("/categories/:id", async (request, response, next) => {
  try {
    const data = categoryEditSchema.parse(request.body);
    const category = await ProductCategory.findOne({ _id: request.params.id, isDeleted: { $ne: true } });
    if (!category) return response.status(404).json({ success: false, message: "Category not found." });
    const normalizedName = data.name.toLocaleLowerCase();
    const duplicate = await ProductCategory.exists({ _id: { $ne: category._id }, normalizedName });
    if (duplicate) return response.status(409).json({ success: false, message: "This category already exists." });
    if (category.name !== data.name) {
      await Product.updateMany({ category: category.name }, { $set: { category: data.name } });
      category.name = data.name;
      category.normalizedName = normalizedName;
    }
    await category.save();
    await category.populate("parentCategory", "name");
    response.json({ success: true, data: category });
  } catch (error) { next(error); }
});

router.delete("/categories/:id", async (request, response, next) => {
  try {
    const category = await ProductCategory.findOne({ _id: request.params.id, isDeleted: { $ne: true } });
    if (!category) return response.status(404).json({ success: false, message: "Category not found." });
    if (await Product.exists({ category: category.name })) {
      return response.status(409).json({ success: false, message: "Products use this category. Move them to another category first." });
    }
    if (await ProductCategory.exists({ parentCategory: category._id, isDeleted: { $ne: true } })) {
      return response.status(409).json({ success: false, message: "This category has subcategories. Delete them first." });
    }
    if (category.builtInKey) {
      category.isDeleted = true;
      await category.save();
    } else {
      await category.deleteOne();
    }
    response.json({ success: true, message: "Category deleted." });
  } catch (error) { next(error); }
});

router.get("/", async (request, response, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    response.json({ success: true, data: products });
  } catch (error) { next(error); }
});

router.get("/:id", async (request, response, next) => {
  try {
    const product = await Product.findById(request.params.id);
    if (!product) return response.status(404).json({ success: false, message: "Product not found" });
    response.json({ success: true, data: product });
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