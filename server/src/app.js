const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");

dotenv.config();

const env = require("./config/env");
const authRoutes = require("./routes/auth.routes");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { requireAuth, requireAnyRole, requireRole, requireAnyMenuPermission } = require("./middleware/auth");
const healthRoutes = require("./routes/health.routes");
const productRoutes = require("./routes/product.routes");
const catalogRoutes = require("./routes/catalog.routes");
const customerRoutes = require("./routes/customer.routes");
const orderRoutes = require("./routes/order.routes");
const userRoutes = require("./routes/user.routes");
const storeRoutes = require("./routes/store.routes");
const offerRoutes = require("./routes/offer.routes");
const overviewRoutes = require("./routes/overview.routes");
const supportRoutes = require("./routes/support.routes");
const reportsRoutes = require("./routes/reports.routes");
const vendorRoutes = require("./routes/vendor.routes");
const purchaseRoutes = require("./routes/purchase.routes");
const addressRoutes = require("./routes/address.routes");
const storeLocationRoutes = require("./routes/storeLocation.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const posRoutes = require("./routes/pos.routes");
const taxCategoryRoutes = require("./routes/taxCategory.routes");
const path = require("path");

const app = express();
app.locals.env = env;

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({
  limit: "1mb",
  verify: (request, response, buffer) => {
    if (request.originalUrl.split("?")[0] === "/api/webhooks/razorpay") request.rawBody = Buffer.from(buffer);
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/", (request, response) => {
  response.json({ success: true, message: "E-Mart API is running" });
});

app.use("/api/health", healthRoutes);
app.use("/api/webhooks/razorpay", require("./routes/razorpayWebhook.routes"));
app.use("/api/auth", authRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/admin/overview", requireAuth, requireAnyRole("admin", "manager", "user"), requireAnyMenuPermission("/admin"), overviewRoutes);
app.use("/api/admin/reports", requireAuth, requireAnyRole("admin", "manager", "user"), requireAnyMenuPermission((request) => request.path === "/sales-transactions" ? ["/admin/sales-transactions", "/admin/reports"] : ["/admin/reports"]), reportsRoutes);
app.use("/api/orders", requireAuth, requireAnyMenuPermission((request) => {
  if (!["admin", "manager", "user"].includes(request.user.role)) return null;
  if (request.method === "GET" && request.path === "/") return ["/admin/orders"];
  if (request.method === "PATCH" && request.path.endsWith("/payment")) return ["/admin/payments"];
  if (request.method === "PATCH" && request.path.endsWith("/status")) return ["/admin/orders"];
  return null;
}), orderRoutes);
app.use("/api/addresses", requireAuth, addressRoutes);
app.use("/api/stores", storeLocationRoutes);
app.use("/api/inventory", requireAuth, requireAnyRole("admin", "manager", "user"), requireAnyMenuPermission("/admin/inventory"), inventoryRoutes);
app.use("/api/pos", requireAuth, requireAnyRole("admin", "manager", "user"), requireAnyMenuPermission("/admin/pos"), posRoutes);
app.use("/api/tax-categories", requireAuth, requireAnyRole("admin", "manager", "user"), requireAnyMenuPermission((request) => {
  if (request.method !== "GET") return ["/admin/tax-categories"];
  return ["/admin/tax-categories", "/admin/products", "/admin/purchase-entry", "/admin/pos"];
}), taxCategoryRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin/support", requireAuth, requireRole("admin"), requireAnyMenuPermission("/admin/support"), supportRoutes);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/products", requireAuth, requireAnyRole("admin", "manager", "user"), requireAnyMenuPermission((request) => {
  if (request.path === "/categories" || request.path.startsWith("/categories/")) return ["/admin/categories", "/admin/products"];
  return request.method === "GET" ? ["/admin/products", "/admin/pos", "/admin/offers", "/admin/purchase-entry"] : ["/admin/products"];
}), productRoutes);
app.use("/api/vendors", requireAuth, requireAnyRole("admin", "manager", "user"), requireAnyMenuPermission((request) => request.method === "GET" ? ["/admin/vendors", "/admin/purchase-entry"] : ["/admin/vendors"]), vendorRoutes);
app.use("/api/purchases", requireAuth, requireAnyRole("admin", "manager", "user"), requireAnyMenuPermission((request) => request.method === "GET" ? ["/admin/vendors", "/admin/purchase-entry"] : ["/admin/purchase-entry"]), purchaseRoutes);
app.use("/api/transaction-returns", requireAuth, requireAnyRole("admin", "manager", "user"), requireAnyMenuPermission("/admin/transaction-returns", "/admin/returns"), require("./routes/transactionReturn.routes"));
app.use("/api/users", requireAuth, requireRole("admin"), requireAnyMenuPermission((request) => {
  if (request.path.startsWith("/inventory-reset/") || request.path.startsWith("/store-reset/")) return ["/admin/settings"];
  if (request.method === "PUT" && request.path.slice(1) === request.user.id) return ["/admin/users", "/admin/settings"];
  return ["/admin/users"];
}), userRoutes);
app.use("/api/customers", requireAuth, requireAnyRole("admin", "manager", "user"), requireAnyMenuPermission((request) => {
  if (request.method === "GET") return ["/admin/customers", "/admin/pos"];
  return ["/admin/customers", "/admin/pos"];
}), customerRoutes);
app.use("/api/admin/orders", requireAuth, requireAnyRole("admin", "manager", "user"), requireAnyMenuPermission((request) => {
  if (request.method === "GET") return ["/admin/orders", "/admin/payments", "/admin/returns"];
  if (request.method === "POST" && request.path.endsWith("/refund")) return ["/admin/returns"];
  if (request.method === "PATCH" && request.path.endsWith("/return-status")) return ["/admin/orders", "/admin/returns"];
  return request.path.endsWith("/payment") ? ["/admin/payments"] : ["/admin/orders"];
}), orderRoutes);
app.post("/api/store/delivery-check", requireAuth, async (request, response, next) => {
  try {
    const StoreSettings = require("./models/StoreSettings");
    const settings = await StoreSettings.findOne({ key: "default" }).lean();
    const pincode = String(request.body.pincode || "").trim();
    const allowed = (settings?.deliveryPincodes || []).map(String).map((value) => value.trim()).filter(Boolean);
    const pincodeMatch = allowed.length ? allowed.includes(pincode) : (!settings?.deliveryPincode || settings.deliveryPincode === pincode);
    let distance = null;
    if (Number.isFinite(Number(request.body.latitude)) && Number.isFinite(Number(request.body.longitude)) && Number.isFinite(Number(settings?.deliveryLatitude)) && Number.isFinite(Number(settings?.deliveryLongitude))) {
      const toRadians = (value) => value * Math.PI / 180;
      const latitudeDelta = toRadians(Number(request.body.latitude) - settings.deliveryLatitude);
      const longitudeDelta = toRadians(Number(request.body.longitude) - settings.deliveryLongitude);
      const radius = 6371;
      const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(toRadians(settings.deliveryLatitude)) * Math.cos(toRadians(Number(request.body.latitude))) * Math.sin(longitudeDelta / 2) ** 2;
      distance = radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    const radiusMatch = distance === null || distance <= Number(settings?.deliveryRadiusKm ?? 10);
    response.json({ success: true, data: { available: pincodeMatch && radiusMatch, pincodeMatch, radiusMatch, distanceKm: distance, radiusKm: Number(settings?.deliveryRadiusKm ?? 10) } });
  } catch (error) { next(error); }
});
app.use("/api/store", requireAuth, requireRole("admin"), requireAnyMenuPermission((request) => {
  if (request.path.startsWith("/testimonials")) return ["/admin/testimonials"];
  if (request.path.startsWith("/hero-slides")) return ["/admin/hero-slider"];
  if (request.path.startsWith("/delivery-settings")) return ["/admin/store/delivery"];
  if (request.path.startsWith("/payment-integrations")) return ["/admin/settings"];
  if (request.method === "GET" && request.path === "/") return ["/admin/store", "/admin/testimonials", "/admin/hero-slider", "/admin/settings"];
  return ["/admin/store"];
}), storeRoutes);
app.use("/api/offers", requireAuth, requireRole("admin"), requireAnyMenuPermission("/admin/offers"), offerRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
