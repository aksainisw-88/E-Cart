const mongoose = require("mongoose");

const connection = mongoose.createConnection();

const connectSuperAdminDatabase = async (uri) => {
  if (!uri) {
    console.warn("SUPER_ADMIN_MONGO_URI is not configured. Super-admin operations will be unavailable.");
    return;
  }

  await connection.openUri(uri);
  const SuperAdmin = require("../models/SuperAdmin");
  const Subscription = require("../models/Subscription");
  const SubscriptionRequest = require("../models/SubscriptionRequest");
  const SubscriptionPlan = require("../models/SubscriptionPlan");
  const BusinessSegment = require("../models/BusinessSegment");
  const CustomerDatabaseConfig = require("../models/CustomerDatabaseConfig");
  const collections = [
    { name: SuperAdmin.collection.collectionName, model: SuperAdmin },
    { name: Subscription.collection.collectionName, model: Subscription },
    { name: SubscriptionRequest.collection.collectionName, model: SubscriptionRequest },
    { name: SubscriptionPlan.collection.collectionName, model: SubscriptionPlan },
    { name: BusinessSegment.collection.collectionName, model: BusinessSegment },
    { name: CustomerDatabaseConfig.collection.collectionName, model: CustomerDatabaseConfig },
  ];
  for (const { name, model } of collections) {
    const exists = await connection.db.listCollections({ name }, { nameOnly: true }).hasNext();
    if (!exists) await model.createCollection();
  }
  await Promise.all([
    SuperAdmin.createIndexes(),
    Subscription.createIndexes(),
    SubscriptionRequest.createIndexes(),
    SubscriptionPlan.createIndexes(),
    BusinessSegment.createIndexes(),
    CustomerDatabaseConfig.createIndexes(),
  ]);
  const defaultSegments = [
    ["SEG001", "Pharma / Medical Store", "PHARMA", "Medicines, healthcare products, and wellness essentials.", "pharmacy"],
    ["SEG002", "Supermart / Grocery", "SUPERMART", "Groceries, household goods, and daily essentials.", "supermarket"],
    ["SEG003", "Garments / Clothing", "GARMENTS", "Clothing, fashion collections, and accessories.", "garments"],
    ["SEG004", "Electronics", "ELECTRONICS", "Consumer electronics, devices, and accessories.", "electronics"],
    ["SEG005", "Hardware", "HARDWARE", "Tools, building materials, and hardware supplies.", "general"],
    ["SEG006", "Footwear", "FOOTWEAR", "Shoes, sandals, and footwear for every occasion.", "footwear"],
    ["SEG007", "Beauty & Cosmetics", "BEAUTY", "Beauty, skincare, makeup, and personal care.", "beauty"],
    ["SEG008", "Home & Living", "HOME_LIVING", "Home furnishings, decor, and household essentials.", "home_living"],
    ["SEG009", "Furniture", "FURNITURE", "Furniture and home furnishing.", "furniture"],
    ["SEG010", "Jewelry", "JEWELRY", "Jewelry, watches, and accessories.", "jewelry"],
    ["SEG011", "Toys", "TOYS", "Toys, games, and children's products.", "toys"],
    ["SEG012", "Books & Stationery", "BOOKS_STATIONERY", "Books, stationery, and office supplies.", "books_stationery"],
    ["SEG013", "Sports & Outdoors", "SPORTS", "Sports equipment, fitness, and outdoor gear.", "sports"],
    ["SEG014", "Pet Supplies", "PET_SUPPLIES", "Pet food, care products, and accessories.", "pet_supplies"],
    ["SEG015", "General Retail", "GENERAL", "A flexible storefront for a mixed product catalogue.", "general"],
  ];
  await Promise.all(defaultSegments.map(([segmentId, name, code, description, baseProfile]) => BusinessSegment.updateOne(
    { code },
    { $setOnInsert: { segmentId, name, code, description, baseProfile, enabled: true } },
    { upsert: true },
  )));
  console.log("Super-admin MongoDB connected; required collections and indexes are ready");
};

const requireSuperAdminDatabase = (request, response, next) => {
  if (connection.readyState !== 1) {
    return response.status(503).json({
      success: false,
      message: "Super-admin database is unavailable. Configure SUPER_ADMIN_MONGO_URI on the API.",
    });
  }
  return next();
};

module.exports = { connection, connectSuperAdminDatabase, requireSuperAdminDatabase };
