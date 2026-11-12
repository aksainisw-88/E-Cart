# E-Cart

## Shared tenant databases

Tenant-aware database routing is opt-in. To enable it on the shared API, configure `TENANT_MONGO_URI` on the backend to a MongoDB Atlas cluster URI whose database user can create and access the generated tenant databases. Keep `MONGO_URI` and all MongoDB credentials server-side. The API provisions a unique database name in the central Super Admin registry; signup requests never choose a database or submit a MongoDB URI.

With `TENANT_MONGO_URI` configured, a new admin first verifies their email and creates an account, then completes store setup. The API generates a tenant ID and an isolated pending database; no customer database credentials are entered in the browser. The admin submits a subscription request for Super Admin review, and business operations stay locked until an approved registration number and license key are verified. The customer frontend routes requests using the generated tenant ID stored in the signed-in session. Existing clients without tenant IDs continue using their current database configuration; migrate them only after a separate backup and verification.

## Client store links

Active shared-platform stores can be opened at `/customer/<store-slug>` and their admin console at `/admin/<store-slug>`. The central tenant registry resolves each slug to its tenant ID and database; the browser never chooses a database name or MongoDB URI. Admins can find the customer URL, copy/share it, and download a QR code from **Store management → Share store**. Sharing is disabled unless the tenant and its subscription are active. Legacy single-database deployments keep their existing routes and database configuration.