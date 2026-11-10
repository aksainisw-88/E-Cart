const crypto = require("crypto");
const ClientCredential = require("../models/ClientCredential");
const { connection } = require("../config/superAdminDatabase");

const deploymentIdFor = (env) => {
  const identity = env.CUSTOMER_DATABASE_ENCRYPTION_KEY || env.MONGO_URI || env.CLIENT_URL;
  return crypto.createHash("sha256").update(`client-credentials:${identity}`).digest("hex");
};

const ensureControlPlaneReady = () => {
  if (connection.readyState !== 1) {
    const error = new Error("Super-admin database is unavailable. Admin sign-in requires a registered client credential.");
    error.statusCode = 503;
    throw error;
  }
};

const createClientCredential = async (email, passwordHash, env) => {
  ensureControlPlaneReady();
  return ClientCredential.create({ deploymentId: deploymentIdFor(env), email: email.toLowerCase(), passwordHash });
};

const upsertClientCredential = async (email, passwordHash, env) => {
  ensureControlPlaneReady();
  await ClientCredential.findOneAndUpdate(
    { deploymentId: deploymentIdFor(env), email: email.toLowerCase() },
    { passwordHash },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
};

const getClientCredential = async (email, env) => {
  ensureControlPlaneReady();
  return ClientCredential.findOne({ deploymentId: deploymentIdFor(env), email: email.toLowerCase() }).select("+passwordHash");
};

const updateClientCredentialPassword = async (email, passwordHash, env) => {
  ensureControlPlaneReady();
  const credential = await ClientCredential.findOneAndUpdate(
    { deploymentId: deploymentIdFor(env), email: email.toLowerCase() },
    { passwordHash },
    { new: true, runValidators: true },
  );
  if (!credential) {
    const error = new Error("This admin account is not registered in the Super Admin database.");
    error.statusCode = 409;
    throw error;
  }
};

const renameClientCredential = async (oldEmail, newEmail, env) => {
  ensureControlPlaneReady();
  const credential = await ClientCredential.findOneAndUpdate(
    { deploymentId: deploymentIdFor(env), email: oldEmail.toLowerCase() },
    { email: newEmail.toLowerCase() },
    { new: true, runValidators: true },
  );
  if (!credential) {
    const error = new Error("This admin account is not registered in the Super Admin database.");
    error.statusCode = 409;
    throw error;
  }
};

const deleteClientCredential = async (email, env) => {
  ensureControlPlaneReady();
  await ClientCredential.deleteOne({ deploymentId: deploymentIdFor(env), email: email.toLowerCase() });
};

const syncExistingStaffCredentials = async (env) => {
  if (connection.readyState !== 1) return;
  const User = require("../models/User");
  const deploymentId = deploymentIdFor(env);
  const users = await User.find({ role: { $in: ["admin", "manager", "user"] } }).select("+password email").lean();
  await Promise.all(users.map((user) => ClientCredential.updateOne(
    { deploymentId, email: user.email.toLowerCase() },
    { $setOnInsert: { deploymentId, email: user.email.toLowerCase(), passwordHash: user.password } },
    { upsert: true, runValidators: true },
  )));
  return users.length;
};

module.exports = {
  createClientCredential,
  upsertClientCredential,
  getClientCredential,
  updateClientCredentialPassword,
  renameClientCredential,
  deleteClientCredential,
  syncExistingStaffCredentials,
};
