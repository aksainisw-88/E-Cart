# E-Cart

## Shared tenant databases

Tenant-aware database routing is opt-in. To enable it on the shared API, configure `TENANT_MONGO_URI` on the backend to a MongoDB Atlas cluster URI whose database user can create and access the generated tenant databases. Keep `MONGO_URI` and all MongoDB credentials server-side. The API provisions a unique database name in the central Super Admin registry; signup requests never choose a database or submit a MongoDB URI.

Only licenses issued while `TENANT_MONGO_URI` is configured receive a tenant ID. Super Admin must provide that tenant ID to the store admin. The customer frontend can select the tenant with `VITE_TENANT_ID` or a `?tenant=<tenant-id>` URL parameter. Requests are routed using the central registry and the tenant ID is bound to the signed-in session. Existing clients without tenant IDs continue using their current database configuration; migrate them only after a separate backup and verification.