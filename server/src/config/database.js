const mongoose = require("mongoose");

const connectDatabase = async (mongoUri) => {
  if (!mongoUri) {
    console.warn("MONGO_URI is not configured. Starting without a database connection.");
    return;
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
};

module.exports = { connectDatabase };