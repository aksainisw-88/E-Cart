const mongoose = require("mongoose");
const { connection } = require("../config/superAdminDatabase");

const customerDatabaseConfigSchema = new mongoose.Schema({
  deploymentId: { type: String, required: true, unique: true },
  encryptedUri: { type: String, required: true },
  iv: { type: String, required: true },
  authTag: { type: String, required: true },
}, { timestamps: true, collection: "customerdatabaseconfigs" });

module.exports = connection.model("CustomerDatabaseConfig", customerDatabaseConfigSchema);
