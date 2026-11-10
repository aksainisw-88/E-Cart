const mongoose = require("mongoose");
const { connection: superAdminConnection, connectSuperAdminDatabase } = require("./superAdminDatabase");
const { getSavedUri } = require("../utils/customerDatabaseConfig");

const databaseOptions = { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 };
let activeMongoUri = "";
let databaseSwitching = false;

const connectDatabase = async (mongoUri, superAdminMongoUri, nodeEnv, encryptionKey) => {
  if (nodeEnv === "production" && !encryptionKey) {
    throw new Error("CUSTOMER_DATABASE_ENCRYPTION_KEY must be configured for each customer API deployment.");
  }
  if (!superAdminMongoUri && nodeEnv === "production") {
    throw new Error("SUPER_ADMIN_MONGO_URI must point to the shared super-admin database in production.");
  }
  await connectSuperAdminDatabase(superAdminMongoUri);

  const savedUri = superAdminConnection.readyState === 1 && encryptionKey
    ? await getSavedUri(encryptionKey)
    : null;
  const selectedUri = savedUri || mongoUri;
  if (!selectedUri) {
    if (nodeEnv === "production") throw new Error("MONGO_URI must be configured before database setup in customer Settings.");
    console.warn("MONGO_URI is not configured. Starting without a database connection.");
    return;
  }
  await mongoose.connect(selectedUri, databaseOptions);
  activeMongoUri = selectedUri;
  console.log(savedUri ? "Configured customer MongoDB connected" : "MongoDB connected");
};

const switchCustomerDatabase = async (mongoUri) => {
  const previousUri = activeMongoUri;
  databaseSwitching = true;
  try {
    await mongoose.connection.close();
    await mongoose.connect(mongoUri, databaseOptions);
    activeMongoUri = mongoUri;
  } catch (error) {
    await mongoose.connection.close();
    if (previousUri) {
      await mongoose.connect(previousUri, databaseOptions);
      activeMongoUri = previousUri;
    }
    throw error;
  } finally {
    databaseSwitching = false;
  }
};

const getActiveMongoUri = () => activeMongoUri;
const requireDatabaseReady = (request, response, next) => {
  if (databaseSwitching) {
    return response.status(503).json({
      success: false,
      message: "The customer database is being switched. Please retry shortly.",
    });
  }
  return next();
};

module.exports = { connectDatabase, switchCustomerDatabase, getActiveMongoUri, requireDatabaseReady };