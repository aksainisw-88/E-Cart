const { AsyncLocalStorage } = require("async_hooks");
const mongoose = require("mongoose");
const Tenant = require("../models/Tenant");
const PendingTenantRegistration = require("../models/PendingTenantRegistration");

const tenantContext = new AsyncLocalStorage();
let tenantRootConnection;
const initializedDatabases = new Map();

const initializeTenantDatabase = async (uri) => {
  if (!uri) return;
  if (tenantRootConnection?.readyState === 1) return;
  tenantRootConnection = await mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  }).asPromise();
};

const assertTenantDatabaseEmpty = async (databaseName) => {
  if (!tenantRootConnection || tenantRootConnection.readyState !== 1) {
    throw new Error("Tenant databases are not configured on this API.");
  }
  const tenantConnection = tenantRootConnection.useDb(databaseName, { useCache: true });
  const collections = await tenantConnection.db.listCollections({}, { nameOnly: true }).toArray();
  if (collections.some(({ name }) => !name.startsWith("system."))) {
    const error = new Error("The generated tenant database already contains data. No existing data was changed; retry tenant provisioning.");
    error.statusCode = 409;
    throw error;
  }
};

const getTenantModel = (modelName) => {
  const context = tenantContext.getStore();
  if (!context?.connection) return mongoose.model(modelName);
  if (context.connection.models[modelName]) return context.connection.models[modelName];
  const baseModel = mongoose.model(modelName);
  return context.connection.model(modelName, baseModel.schema, baseModel.collection.collectionName);
};

const createTenantModel = (modelName, schema) => {
  const baseModel = mongoose.models[modelName] || mongoose.model(modelName, schema);
  return new Proxy(baseModel, {
    get(target, property) {
      const model = tenantContext.getStore()?.connection
        ? getTenantModel(modelName)
        : target;
      const value = Reflect.get(model, property, model);
      return typeof value === "function" ? value.bind(model) : value;
    },
  });
};

const runWithTenant = (tenant, callback) => {
  const connection = tenantRootConnection.useDb(tenant.databaseName, { useCache: true });
  let initialization = initializedDatabases.get(tenant.databaseName);
  if (!initialization) {
    initialization = Promise.resolve().then(async () => {
      const modelNames = mongoose.connection.modelNames();
      const models = modelNames.map((name) => getTenantModelForConnection(connection, name));
      await Promise.all(models.map((model) => model.init()));
    });
    initializedDatabases.set(tenant.databaseName, initialization);
    initialization.catch(() => initializedDatabases.delete(tenant.databaseName));
  }
  return tenantContext.run({ tenantId: tenant.tenantId, connection, tenant }, async () => {
    await initialization;
    return callback();
  });
};

const getTenantModelForConnection = (connection, modelName) => {
  if (connection.models[modelName]) return connection.models[modelName];
  const baseModel = mongoose.model(modelName);
  return connection.model(modelName, baseModel.schema, baseModel.collection.collectionName);
};

const getCurrentTenant = () => tenantContext.getStore()?.tenant || null;
const getCurrentTenantId = () => tenantContext.getStore()?.tenantId || "";

const resolveTenant = async (tenantId) => {
  if (!tenantId) return null;
  const tenant = await Tenant.findOne({ tenantId: tenantId.toLowerCase() }).lean();
  if (tenant) return tenant;
  const pendingRegistration = await PendingTenantRegistration.findOne({
    tenantId: tenantId.toLowerCase(),
    status: "Pending",
  }).lean();
  if (pendingRegistration) return pendingRegistration;
  const suspendedTenant = await Tenant.exists({ tenantId: tenantId.toLowerCase() });
  if (suspendedTenant) {
    const error = new Error("This store is suspended. Contact the platform administrator.");
    error.statusCode = 403;
    throw error;
  }
  const error = new Error("This store is not available. Check the store address or contact support.");
  error.statusCode = 404;
  throw error;
};

const isTenantOnboardingRequest = (request) => {
  const path = request.originalUrl.split("?")[0];
  return /^\/api\/auth\/(?:login\/admin|me|logout|admin-store-setup|admin-forgot-password|admin-reset-password|forgot-password|reset-password)$/.test(path)
    || /^\/api\/subscription\/(?:status|plans|request|activate)$/.test(path)
    || (request.method === "GET" && path === "/api/business-segments");
};

const restrictPendingTenant = (tenant, request) => {
  if (tenant.status === "Active") return null;
  if (tenant.status === "Pending" || tenant.status === "PendingActivation") {
    if (isTenantOnboardingRequest(request)) return null;
    const error = new Error("Store operations are locked until Super Admin approval and license activation are complete.");
    error.statusCode = 403;
    error.code = "SUBSCRIPTION_REQUIRED";
    return error;
  }
  const error = new Error("This store is suspended. Contact the platform administrator.");
  error.statusCode = 403;
  return error;
};

const tenantDatabaseMiddleware = (request, response, next) => {
  const token = request.cookies?.accessToken;
  let tokenTenantId = "";
  if (token) {
    try {
      const jwt = require("jsonwebtoken");
      tokenTenantId = jwt.verify(token, request.app.locals.env.JWT_SECRET).tenantId || "";
    } catch {
      tokenTenantId = "";
    }
  }
  const requestedTenantId = request.get("x-tenant-id") || tokenTenantId;
  if (tokenTenantId && request.get("x-tenant-id") && tokenTenantId !== request.get("x-tenant-id").toLowerCase()) {
    return response.status(403).json({ success: false, message: "The selected store does not match this session." });
  }
  if (!requestedTenantId) return next();
  if (!tenantRootConnection || tenantRootConnection.readyState !== 1) {
    return response.status(503).json({
      success: false,
      message: "Tenant databases are not configured on this API. Contact the platform administrator.",
    });
  }

  resolveTenant(requestedTenantId)
    .then((tenant) => {
      if (!tenant) return next();
      const restrictionError = restrictPendingTenant(tenant, request);
      if (restrictionError) return next(restrictionError);
      return runWithTenant(tenant, next);
    })
    .catch(next);
};

module.exports = {
  createTenantModel,
  assertTenantDatabaseEmpty,
  getCurrentTenant,
  getCurrentTenantId,
  initializeTenantDatabase,
  resolveTenant,
  runWithTenant,
  restrictPendingTenant,
  tenantDatabaseMiddleware,
};
