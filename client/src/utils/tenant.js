const adminRouteNames = new Set([
  "login", "register", "reset-password", "store-setup", "subscription-registration",
  "reports", "sales-transactions", "products", "inventory", "categories", "tax-categories",
  "users", "customers", "orders", "returns", "transaction-returns", "sales-return",
  "replacements", "purchase-return", "pos", "purchase-entry", "vendors", "payments",
  "store", "stores", "testimonials", "hero-slider", "support", "offers", "settings",
]);

const routeTenantSlug = () => {
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return "";
  const [section, rawSlug] = segments;
  const slug = rawSlug.trim().toLowerCase();
  if (!slug) return "";
  if (section === "customer" && !["login", "register"].includes(slug)) return slug;
  if (section === "admin" && segments.length === 2 && !adminRouteNames.has(slug)) return slug;
  return "";
};

export const getTenantRouteBase = () => {
  const match = window.location.pathname.match(/^\/customer\/([^/]+)(?:\/|$)/i);
  const slug = match?.[1]?.trim().toLowerCase();
  if (!slug || ["login", "register"].includes(slug)) return undefined;
  return `/customer/${slug}`;
};

export const selectTenantSlug = (slug) => {
  const normalizedSlug = slug.trim().toLowerCase();
  window.localStorage.setItem("eCartTenantSlug", normalizedSlug);
  window.localStorage.removeItem("eCartTenantId");
};

export const getTenantSlug = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const queryTenantId = searchParams.get("tenant")?.trim().toLowerCase();
  const queryTenantSlug = searchParams.get("store")?.trim().toLowerCase();
  const pathSlug = routeTenantSlug();
  if (pathSlug) {
    selectTenantSlug(pathSlug);
    return pathSlug;
  }
  if (queryTenantSlug) {
    selectTenantSlug(queryTenantSlug);
    return queryTenantSlug;
  }
  if (window.location.pathname === "/admin/register" && !queryTenantId && !import.meta.env.VITE_TENANT_ID) {
    window.localStorage.removeItem("eCartTenantSlug");
    return "";
  }
  if (queryTenantId || searchParams.has("tenant")) {
    window.localStorage.removeItem("eCartTenantSlug");
    return "";
  }
  return window.localStorage.getItem("eCartTenantSlug")?.trim().toLowerCase() || "";
};

export const getTenantId = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const queryTenantId = searchParams.get("tenant")?.trim().toLowerCase();
  if (routeTenantSlug() || searchParams.has("store")) {
    window.localStorage.removeItem("eCartTenantId");
    return "";
  }
  if (queryTenantId) window.localStorage.setItem("eCartTenantId", queryTenantId);
  else if (searchParams.has("tenant")) window.localStorage.removeItem("eCartTenantId");
  if (window.location.pathname === "/admin/register" && !queryTenantId && !import.meta.env.VITE_TENANT_ID) return "";
  return import.meta.env.VITE_TENANT_ID?.trim().toLowerCase()
    || queryTenantId
    || window.localStorage.getItem("eCartTenantId")
    || "";
};

export const tenantHeaders = (headers = {}) => {
  const result = new Headers(headers);
  const tenantSlug = getTenantSlug();
  const tenantId = getTenantId();
  if (tenantSlug) result.set("x-tenant-slug", tenantSlug);
  if (tenantId) result.set("x-tenant-id", tenantId);
  return result;
};
