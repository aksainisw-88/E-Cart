# E-Mart API Server

Backend service for the E-Mart storefront and admin console.

## Setup

```powershell
Copy-Item .env.example .env
npm run dev
```

For Razorpay checkout, add the Test or Live credentials from the Razorpay dashboard to `.env`:

```text
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

The secret stays on the server. The client opens Razorpay Checkout with the public key, and the server verifies the returned signature before marking an order as paid. The admin Payments page shows the Razorpay order and payment IDs.

## Signup email verification

Customer signup requires a six-digit email verification code. Configure SMTP in the server `.env` to deliver codes:

```text
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=E-Mart <accounts@example.com>
```

Use your provider's SMTP host, port, TLS mode, and credentials. In development only, when SMTP is unset, the code is returned to the signup screen for local testing. Production signup fails closed until SMTP is configured. Codes expire after 10 minutes and are limited to five verification attempts.

Forgot-password requests use the same SMTP settings. Reset links expire after one hour and can only be used once. When SMTP is unset in development, the reset screen displays a local-only link for testing.

Admin inventory resets use a six-digit OTP. With SMTP configured, the code is sent to the signed-in admin email. Without SMTP, the authenticated admin can use the one-time fallback code displayed in Admin Settings. Codes are stored as hashes, expire after 10 minutes, and allow at most five attempts. The fallback is visible only to the authenticated admin requesting it. The separate full-store reset continues to require email delivery. Configure `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` on Render service `e-mart-api` to deliver reset codes by email. `SMTP_FROM` may be omitted when the provider sender is the same as `SMTP_USER`.

## Promotions and POS integrations

Active offer codes can be claimed from the customer Offers page and applied during checkout. The server validates the code, dates, minimum order, and discount again when the order is created.

Admin users can configure PhonePe, Paytm, Fingpay, and Pine Labs credentials from Admin > Settings > Payment integrations. Credentials are masked in API responses. Actual terminal charging requires the provider's approved merchant account, device/API access, and provider-specific SDK or API contract.

## Super-admin subscriptions

## Separate customer database deployments

Deploy one API instance and one customer-panel build per customer. Do not put a MongoDB URI in the browser or customer-facing settings. Set the database URIs only in the server's private environment:

- `MONGO_URI`: initial/fallback URI for this customer's private database, for example `mongodb+srv://.../e_mart_customer_002`. It is only configured on the API server.
- `SUPER_ADMIN_MONGO_URI`: the shared platform control-plane database (the `Super_admin` database), identical for all customer API deployments.
- `CUSTOMER_DATABASE_ENCRYPTION_KEY`: a unique random secret of at least 32 characters for this customer API deployment. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Keep it stable in the API's secret environment, and do not reuse it across customer deployments; it encrypts and identifies this deployment's saved database URI.
- `CLIENT_URL`: this customer's deployed storefront/admin-panel origin.
- `SUPER_ADMIN_PANEL_URL`: the super-admin panel origin.

Set the customer's `VITE_API_URL` at client build time to that customer's API URL (without a trailing slash). All customer-panel API requests use this value. Leave it empty only when the frontend host proxies `/api` and `/uploads` to the customer's API.

After subscription activation, the customer admin can enter a MongoDB Atlas SRV URI in Admin > Settings > Customer database. The URI is tested before use and stored encrypted in the shared control-plane database with AES-256-GCM; it is never returned to the browser. The URI's host must be an Atlas `*.mongodb.net` host and the target database must be empty. Switching databases copies no store data; it creates only the signed-in admin account in the target database to preserve that admin's existing credentials and license binding. The previous database is left unchanged. This setting requires `CUSTOMER_DATABASE_ENCRYPTION_KEY` on the API deployment.

To provision another customer, create/deploy its API with its own initial `MONGO_URI`, unique `CUSTOMER_DATABASE_ENCRYPTION_KEY`, and the shared `SUPER_ADMIN_MONGO_URI`, then create its store admin on that API:

```powershell
npm run create-admin -- store-admin@example.com StrongPassword "Store Admin"
```

In the Super Admin panel, create the subscription using that exact admin email and securely give the generated registration number and license key to that customer. The admin activates the subscription in Settings. Each API instance uses its own active customer database, while license records and super-admin accounts remain in the shared control-plane database. Production API startup fails if required database configuration or the encryption key is missing. MongoDB creates each customer database/collections on first write.

## Super-admin subscriptions

The Super Admin panel uses the API but stores platform accounts and subscriptions in the dedicated MongoDB database configured by `SUPER_ADMIN_MONGO_URI`. Set `SUPER_ADMIN_PANEL_URL` to the panel's exact origin so the API allows credentialed requests. On startup, the API creates the `superadmins` and `subscriptions` collections and indexes if needed. Create the platform account from the server directory:

```powershell
npm run create-super-admin -- platform@example.com StrongPassword "Platform Admin"
```

In the deployed panel build, set `VITE_API_URL` to this API's URL. The super-admin creates a client using the email address of that client's admin account. The API stores only a hash of the issued license key. The customer admin enters the registration number and key under Admin > Settings. Admin API operations require a matching admin email, active subscription, and current validity date; subscription status and license activation remain accessible so the account can be renewed or activated.

The API starts at `http://localhost:5000` by default.

## Current endpoints

- `GET /` - API welcome response
- `GET /api/health` - service health check
- `GET /api/products` - products resource placeholder
- `GET /api/users` - users resource placeholder
- `GET /api/customers` - customers resource placeholder
- `GET /api/orders` - orders resource placeholder
- `GET /api/store` - store resource placeholder

The resource routes are intentionally lightweight scaffolds. Models, authentication, and CRUD handlers can be added without changing the server entry point.

## Roles

Public registration creates `customer` accounts. Admin/store-head accounts are created from the server terminal:

```powershell
npm run create-admin -- admin@example.com StrongPassword "Store Head"
```

Customers can use the storefront, while admin API resources and the `/admin` console require an authenticated admin/staff account and an active subscription. The platform panel requires a `super_admin` account.
