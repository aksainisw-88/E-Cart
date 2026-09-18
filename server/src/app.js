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
const { requireAuth, requireAnyRole, requireRole } = require("./middleware/auth");
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
const addressRoutes = require("./routes/address.routes");
const path = require("path");

const app = express();
app.locals.env = env;

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/", (request, response) => {
  response.json({ success: true, message: "E-Mart API is running" });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/admin/overview", requireAuth, requireAnyRole("admin", "manager", "user"), overviewRoutes);
app.use("/api/admin/reports", requireAuth, requireAnyRole("admin", "manager", "user"), reportsRoutes);
app.use("/api/orders", requireAuth, orderRoutes);
app.use("/api/addresses", requireAuth, addressRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin/support", requireAuth, requireRole("admin"), supportRoutes);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/products", requireAuth, requireAnyRole("admin", "manager", "user"), productRoutes);
app.use("/api/users", requireAuth, requireRole("admin"), userRoutes);
app.use("/api/customers", requireAuth, requireAnyRole("admin", "manager", "user"), customerRoutes);
app.use("/api/admin/orders", requireAuth, requireAnyRole("admin", "manager", "user"), orderRoutes);
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
app.use("/api/store", requireAuth, requireRole("admin"), storeRoutes);
app.use("/api/offers", requireAuth, requireRole("admin"), offerRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;