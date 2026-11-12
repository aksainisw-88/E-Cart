export const getTenantId = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const queryTenantId = searchParams.get("tenant")?.trim().toLowerCase();
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
  const tenantId = getTenantId();
  if (tenantId) result.set("x-tenant-id", tenantId);
  return result;
};
