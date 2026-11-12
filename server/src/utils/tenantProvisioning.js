const crypto = require("crypto");
const Tenant = require("../models/Tenant");
const PendingTenantRegistration = require("../models/PendingTenantRegistration");
const { assertTenantDatabaseEmpty, runWithTenant } = require("./tenantDatabase");

const createTenantForSubscription = async (subscription, enabled, registeredTenantId = "") => {
  if (!enabled) return null;
  const pendingRegistration = registeredTenantId
    ? await PendingTenantRegistration.findOne({ tenantId: registeredTenantId, adminEmail: subscription.email })
    : null;
  if (registeredTenantId && !pendingRegistration) {
    const error = new Error("The pending tenant registration linked to this request could not be found.");
    error.statusCode = 409;
    throw error;
  }
  const tenantId = crypto.randomBytes(12).toString("hex");
  const resolvedTenantId = pendingRegistration?.tenantId || tenantId;
  const databaseName = pendingRegistration?.databaseName || `ecart_${tenantId}`;
  if (!pendingRegistration) await assertTenantDatabaseEmpty(databaseName);
  const tenant = await Tenant.create({
    tenantId: resolvedTenantId,
    databaseName,
    businessName: pendingRegistration?.businessName || subscription.business,
    businessType: pendingRegistration?.businessType || "",
    adminEmail: subscription.email,
    subscription: subscription._id,
    status: pendingRegistration ? "PendingActivation" : "Active",
  });
  try {
    subscription.tenantId = resolvedTenantId;
    await subscription.save();
    await runWithTenant(tenant, async () => {});
  } catch (error) {
    await tenant.deleteOne();
    throw error;
  }
  return tenant;
};

module.exports = { createTenantForSubscription };
