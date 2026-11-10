const mongoose = require("mongoose");
const { connectSuperAdminDatabase } = require("./superAdminDatabase");

const connectDatabase = async (mongoUri, superAdminMongoUri) => {
  if (!mongoUri) {
    console.warn("MONGO_URI is not configured. Starting without a database connection.");
  } else {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
  }

  await connectSuperAdminDatabase(superAdminMongoUri);
};

module.exports = { connectDatabase };