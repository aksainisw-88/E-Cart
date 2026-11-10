const crypto = require("crypto");
const Tenant = require("../models/Tenant");
const { assertTenantDatabaseEmpty, runWithTenant } = require("./tenantDatabase");

const createTenantForSubscription = async (subscription, enabled) => {
  if (!enabled) return null;
  const tenantId = crypto.randomBytes(12).toString("hex");
  const databaseName = `ecart_${tenantId}`;
  await assertTenantDatabaseEmpty(databaseName);
  const tenant = await Tenant.create({
    tenantId,
    databaseName,
    businessName: subscription.business,
    adminEmail: subscription.email,
    subscription: subscription._id,
    status: "Active",
  });
  try {
    subscription.tenantId = tenantId;
    await subscription.save();
    await runWithTenant(tenant, async () => {});
  } catch (error) {
    await tenant.deleteOne();
    throw error;
  }
  return tenant;
};

module.exports = { createTenantForSubscription };
