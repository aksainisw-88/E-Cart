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
  const collections = [
    { name: SuperAdmin.collection.collectionName, model: SuperAdmin },
    { name: Subscription.collection.collectionName, model: Subscription },
  ];
  for (const { name, model } of collections) {
    const exists = await connection.db.listCollections({ name }, { nameOnly: true }).hasNext();
    if (!exists) await model.createCollection();
  }
  await Promise.all([SuperAdmin.createIndexes(), Subscription.createIndexes()]);
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
