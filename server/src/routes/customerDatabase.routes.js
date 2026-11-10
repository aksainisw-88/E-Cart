const express = require("express");
const mongoose = require("mongoose");
const { z } = require("zod");

const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");
const { requireSuperAdminDatabase } = require("../config/superAdminDatabase");
const { getActiveMongoUri, switchCustomerDatabase } = require("../config/database");
const { getSavedUri, saveUri, clearUri } = require("../utils/customerDatabaseConfig");
const { getSubscriptionForUser } = require("../utils/subscription");

const router = express.Router();
const databaseUriSchema = z.object({
  uri: z.string().trim().min(20).max(2048),
});
let configurationInProgress = false;

const parseAtlasUri = (uri) => {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error("Enter a valid MongoDB Atlas connection URI.");
  }

  const hostname = parsed.hostname.toLowerCase();
  const labels = hostname.split(".");
  const isAtlasHost = labels.length >= 3
    && labels.at(-2) === "mongodb"
    && labels.at(-1) === "net"
    && labels.every((label) => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label));
  let databaseName;
  try {
    databaseName = decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    throw new Error("Enter a valid MongoDB Atlas database name.");
  }
  const allowedOptions = new Set(["retrywrites", "w", "appname", "authsource"]);
  const optionsAllowed = [...parsed.searchParams.keys()].every((key) => allowedOptions.has(key.toLowerCase()));
  const safeWriteConcern = [...parsed.searchParams.entries()].every(([key, value]) => {
    if (key.toLowerCase() === "w") return value.toLowerCase() === "majority";
    if (key.toLowerCase() === "retrywrites") return value.toLowerCase() === "true";
    return true;
  });
  if (
    parsed.protocol !== "mongodb+srv:"
    || !isAtlasHost
    || parsed.port
    || !parsed.username
    || !parsed.password
    || parsed.hash
    || !/^[a-zA-Z0-9_-]{1,63}$/.test(databaseName)
    || ["admin", "local", "config"].includes(databaseName.toLowerCase())
    || !optionsAllowed
    || !safeWriteConcern
  ) {
    throw new Error("Use a MongoDB Atlas SRV URI with credentials and a customer database name. Only standard Atlas options are allowed.");
  }
  return databaseName;
};

const loadActiveAdmin = async (request, response) => {
  const admin = await User.findById(request.user.id).select("+password +subscriptionKeyHash");
  if (!admin || admin.role !== "admin" || admin.status === "Blocked") {
    response.status(403).json({ success: false, message: "An active customer admin account is required." });
    return null;
  }
  const subscription = await getSubscriptionForUser(admin);
  if (!subscription?.active) {
    response.status(403).json({ success: false, message: "An active subscription is required to configure the customer database." });
    return null;
  }
  return admin;
};

router.use(requireSuperAdminDatabase, requireAuth, requireRole("admin"));

router.get("/status", async (request, response, next) => {
  try {
    const admin = await loadActiveAdmin(request, response);
    if (!admin) return;
    const encryptionKey = request.app.locals.env.CUSTOMER_DATABASE_ENCRYPTION_KEY;
    const savedUri = encryptionKey ? await getSavedUri(encryptionKey) : null;
    return response.json({
      success: true,
      data: {
        connected: mongoose.connection.readyState === 1,
        configuredInSettings: Boolean(savedUri),
        databaseName: mongoose.connection.name || "",
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/", async (request, response) => {
  const parsed = databaseUriSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ success: false, message: "Enter a valid MongoDB Atlas connection URI." });
  }
  try {
    parseAtlasUri(parsed.data.uri);
  } catch (error) {
    return response.status(400).json({ success: false, message: error.message });
  }
  if (configurationInProgress) {
    return response.status(409).json({ success: false, message: "A customer database change is already in progress." });
  }

  configurationInProgress = true;
  let targetConnection;
  let failureStage = "checking customer admin access";
  try {
    const admin = await loadActiveAdmin(request, response);
    if (!admin) return;

    const env = request.app.locals.env;
    if (!env.CUSTOMER_DATABASE_ENCRYPTION_KEY) {
      return response.status(503).json({
        success: false,
        message: "Database settings are not enabled on this API. Contact the platform administrator.",
      });
    }

    const originalUri = getActiveMongoUri();
    if (!originalUri) {
      return response.status(503).json({ success: false, message: "The current customer database is unavailable." });
    }

    failureStage = "testing the target MongoDB Atlas database";
    const collectionsBefore = [];
    targetConnection = await mongoose.createConnection(parsed.data.uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    }).asPromise();
    collectionsBefore.push(...await targetConnection.db.listCollections({}, { nameOnly: true }).toArray());
    const customerCollections = collectionsBefore.filter(({ name }) => !name.startsWith("system."));
    const TargetUser = targetConnection.model("User", User.schema);
    if (customerCollections.length === 0) {
      await TargetUser.createIndexes();
      const adminRecord = admin.toObject();
      await TargetUser.create(adminRecord);
    } else if (customerCollections.length === 1 && customerCollections[0].name === "users") {
      const users = await TargetUser.find().select("_id email role").limit(2).lean();
      const onlyMatchingAdmin = users.length === 1
        && users[0]._id.toString() === admin._id.toString()
        && users[0].email === admin.email
        && users[0].role === "admin";
      if (!onlyMatchingAdmin) {
        await targetConnection.close();
        targetConnection = null;
        return response.status(409).json({
          success: false,
          message: "The selected database is not empty. Choose a new customer database; existing store data is never overwritten.",
        });
      }
    } else {
      await targetConnection.close();
      targetConnection = null;
      return response.status(409).json({
        success: false,
        message: "The selected database is not empty. Choose a new customer database; existing store data is never overwritten.",
      });
    }
    await targetConnection.close();
    targetConnection = null;

    failureStage = "saving the encrypted database configuration";
    const previousSavedUri = await getSavedUri(env.CUSTOMER_DATABASE_ENCRYPTION_KEY);
    await saveUri(parsed.data.uri, env.CUSTOMER_DATABASE_ENCRYPTION_KEY);
    failureStage = "switching the customer API database";
    try {
      await switchCustomerDatabase(parsed.data.uri);
    } catch (error) {
      if (previousSavedUri) {
        await saveUri(previousSavedUri, env.CUSTOMER_DATABASE_ENCRYPTION_KEY);
      } else {
        await clearUri(env.CUSTOMER_DATABASE_ENCRYPTION_KEY);
      }
      throw error;
    }

    return response.json({
      success: true,
      message: "Customer database connected. Only your admin account was added; no store data was copied.",
      data: { connected: true, configuredInSettings: true, databaseName: mongoose.connection.name || "" },
    });
  } catch (error) {
    if (targetConnection) {
      try {
        await targetConnection.close();
      } catch (closeError) {
        console.error("Temporary customer database connection cleanup failed:", closeError.name, closeError.code || "");
      }
    }
    console.error(`Customer database configuration failed while ${failureStage}:`, error.name, error.code || "");
    return response.status(502).json({
      success: false,
      message: failureStage === "testing the target MongoDB Atlas database"
        ? "Unable to connect to the selected database. Check the Atlas network access and database user permissions."
        : failureStage === "saving the encrypted database configuration"
          ? "The database was tested, but the configuration could not be saved. No database switch was made."
          : failureStage === "switching the customer API database"
            ? "The API could not switch to the new database. Existing database data was not changed; verify API connectivity before retrying."
            : "Unable to verify the customer admin and subscription for this database change.",
    });
  } finally {
    configurationInProgress = false;
  }
});

module.exports = router;
