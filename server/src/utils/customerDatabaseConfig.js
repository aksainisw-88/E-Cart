const crypto = require("crypto");
const CustomerDatabaseConfig = require("../models/CustomerDatabaseConfig");

const deploymentIdFor = (secret) => crypto.createHash("sha256").update(`customer-database:${secret}`).digest("hex");
const encryptionKey = (secret) => crypto.createHash("sha256").update(secret).digest();

const encryptUri = (uri, secret) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const encryptedUri = Buffer.concat([cipher.update(uri, "utf8"), cipher.final()]);
  return {
    encryptedUri: encryptedUri.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
};

const decryptUri = (config, secret) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(secret),
    Buffer.from(config.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(config.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(config.encryptedUri, "base64")),
    decipher.final(),
  ]).toString("utf8");
};

const getSavedUri = async (secret) => {
  const config = await CustomerDatabaseConfig.findOne({ deploymentId: deploymentIdFor(secret) }).lean();
  return config ? decryptUri(config, secret) : null;
};

const saveUri = async (uri, secret) => {
  const encrypted = encryptUri(uri, secret);
  await CustomerDatabaseConfig.findOneAndUpdate(
    { deploymentId: deploymentIdFor(secret) },
    encrypted,
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
};

const clearUri = async (secret) => {
  await CustomerDatabaseConfig.deleteOne({ deploymentId: deploymentIdFor(secret) });
};

module.exports = { getSavedUri, saveUri, clearUri };
