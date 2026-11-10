const express = require("express");
const mongoose = require("mongoose");
const { z } = require("zod");

const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");
const { requireSuperAdminDatabase } = require("../config/superAdminDatabase");
const { getActiveMongoUri, switchCustomerDatabase } = require("../config/database");
const { getSavedUri, saveUri, clearUri } = require("../utils/customerDatabaseConfig");
const { parseAtlasUri } = require("../utils/atlasUri");
const { getSubscriptionForUser } = require("../utils/subscription");
const { getCurrentTenant } = require("../utils/tenantDatabase");

const router = express.Router();
const databaseUriSchema = z.object({
  uri: z.string().trim().min(20).max(2048),
});
let configurationInProgress = false;

const atlasConnectionFailureMessage = (error) => {
  const cause = error.cause || error;
  const code = String(error.code || cause.code || "");
  const details = `${error.name || ""} ${error.message || ""} ${cause.name || ""} ${cause.message || ""}`.toLowerCase();

  if (code === "18" || /authentication failed|bad auth|auth failed/.test(details)) {
    return "Atlas rejected the database credentials. Verify the Atlas database username and password, URL-encode special characters in the password, and grant the user read/write access to the selected database.";
  }
  if (code === "13" || /not authorized|unauthorized/.test(details)) {
    return "The Atlas database user does not have enough permissions. Grant it read/write access to the selected database, including permission to create collections and indexes.";
  }
  if (/enotfound|querysrv|serverselection|etimedout|econnrefused|network|no dns records/.test(details)) {
    return "The API could not reach the Atlas cluster. Verify the SRV hostname and allow the Render API's outbound IP addresses in Atlas Network Access.";
  }
  return "The Atlas connection test failed. Verify the SRV hostname, Atlas Network Access, database credentials, password URL-encoding, and database-user permissions.";
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
    const tenant = getCurrentTenant();
    if (tenant) {
      return response.json({
        success: true,
        data: { connected: true, configuredInSettings: true, databaseName: tenant.databaseName },
      });
    }
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
  if (getCurrentTenant() || request.app.locals.env.TENANT_MONGO_URI) {
    return response.status(403).json({
      success: false,
      message: "Databases on a shared API are provisioned by the platform and cannot be changed from store settings.",
    });
  }
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

    if (parsed.data.uri === originalUri) {
      const savedUri = await getSavedUri(env.CUSTOMER_DATABASE_ENCRYPTION_KEY);
      return response.json({
        success: true,
        message: "This database is already active. No database changes were made.",
        data: {
          connected: mongoose.connection.readyState === 1,
          configuredInSettings: Boolean(savedUri),
          databaseName: mongoose.connection.name || "",
        },
      });
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
        ? atlasConnectionFailureMessage(error)
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
