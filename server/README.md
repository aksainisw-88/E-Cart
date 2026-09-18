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