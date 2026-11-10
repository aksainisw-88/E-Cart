const mongoose = require("mongoose");
const { connection } = require("../config/superAdminDatabase");

const clientCredentialSchema = new mongoose.Schema({
  deploymentId: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
}, { timestamps: true, collection: "clientcredentials" });

clientCredentialSchema.index({ deploymentId: 1, email: 1 }, { unique: true });

module.exports = connection.model("ClientCredential", clientCredentialSchema);
