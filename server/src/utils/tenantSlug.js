const crypto = require("crypto");
const Tenant = require("../models/Tenant");
const PendingTenantRegistration = require("../models/PendingTenantRegistration");

const reservedSlugs = new Set([
  "login", "register", "reset-password", "store-setup", "subscription-registration",
  "reports", "sales-transactions", "products", "inventory", "categories", "tax-categories",
  "users", "customers", "orders", "returns", "transaction-returns", "sales-return",
  "replacements", "purchase-return", "pos", "purchase-entry", "vendors", "payments",
  "store", "stores", "testimonials", "hero-slider", "support", "offers", "settings",
]);
const slugify = (value) => String(value || "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 48)
  .replace(/-+$/g, "") || "store";

const assignTenantSlug = async (tenant, Model, name) => {
  if (tenant.slug) return tenant.slug;
  const base = slugify(name);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = attempt === 0 && !reservedSlugs.has(base) ? "" : `-${crypto.randomBytes(2).toString("hex")}`;
    const candidate = `${base.slice(0, 48 - suffix.length).replace(/-+$/g, "")}${suffix}`;
    const query = { slug: candidate, tenantId: { $ne: tenant.tenantId } };
    const [existingTenant, existingRegistration] = await Promise.all([
      Tenant.exists(query),
      PendingTenantRegistration.exists(query),
    ]);
    if (existingTenant || existingRegistration) continue;

    tenant.slug = candidate;
    try {
      await tenant.save();
      return candidate;
    } catch (error) {
      tenant.slug = "";
      if (error.code !== 11000) throw error;
      const current = await Model.findOne({ tenantId: tenant.tenantId }).select("slug").lean();
      if (current?.slug) {
        tenant.slug = current.slug;
        return current.slug;
      }
    }
  }

  const error = new Error("Unable to allocate a unique store URL. Please try again.");
  error.statusCode = 409;
  throw error;
};

module.exports = { assignTenantSlug, slugify };
