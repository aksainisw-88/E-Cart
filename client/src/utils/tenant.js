export const getTenantId = () => {
  const queryTenantId = new URLSearchParams(window.location.search).get("tenant")?.trim().toLowerCase();
  if (queryTenantId) window.localStorage.setItem("eCartTenantId", queryTenantId);
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
