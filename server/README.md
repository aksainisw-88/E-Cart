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

Customers can use the storefront, while admin API resources and the `/admin` console require an authenticated account with the `admin` role.
