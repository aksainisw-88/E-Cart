const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { z } = require("zod");

const User = require("../models/User");
const BusinessSegment = require("../models/BusinessSegment");
const SignupOtp = require("../models/SignupOtp");
const AdminSignupOtp = require("../models/AdminSignupOtp");
const PasswordReset = require("../models/PasswordReset");
const Subscription = require("../models/Subscription");
const StoreSettings = require("../models/StoreSettings");
const { getActiveMongoUri, switchCustomerDatabase } = require("../config/database");
const { clearUri, getSavedUri, saveUri } = require("../utils/customerDatabaseConfig");
const { parseAtlasUri } = require("../utils/atlasUri");
const { today } = require("../utils/subscription");
const { requireAuth } = require("../middleware/auth");
const { getSubscriptionForUser } = require("../utils/subscription");
const {
  createClientCredential,
  deleteClientCredential,
  getClientDeploymentId,
  getClientCredential,
  updateClientCredentialPassword,
} = require("../utils/clientCredentials");
const { isEmailConfigured, sendPasswordResetLink, sendSignupCode } = require("../utils/email");

const router = express.Router();
const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});
const registrationSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(80),
  otp: z.string().regex(/^\d{6}$/),
  customerType: z.enum(["B2C", "B2B"]).default("B2C"),
  businessName: z.string().trim().max(120).optional().default(""),
  gstin: z.string().trim().max(15).optional().default(""),
}).superRefine((data, context) => {
  if (data.customerType === "B2B" && data.businessName.length < 2) {
    context.addIssue({ code: "custom", path: ["businessName"], message: "Enter your business name." });
  }
});
const adminRegistrationSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(80),
  otp: z.string().regex(/^\d{6}$/),
  storeName: z.string().trim().min(2).max(100),
  businessSegmentId: z.string().trim().min(5).max(64),
  tagline: z.string().trim().max(160).optional().default(""),
  storeDescription: z.string().trim().max(500).optional().default(""),
  storePhone: z.string().trim().min(5).max(30),
  storeEmail: z.string().email(),
  storeAddress: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(80),
  deliveryPincode: z.string().trim().regex(/^$|^\d{6}$/).optional().default(""),
  deliveryFee: z.coerce.number().min(0).max(100000).default(49),
  freeDeliveryAbove: z.coerce.number().min(0).max(10000000).default(999),
  theme: z.enum(["teal", "blue", "emerald", "amber"]).default("teal"),
  registrationNumber: z.string().trim().min(5).max(40),
  licenseKey: z.string().trim().min(8).max(80),
  customerDatabaseUri: z.string().trim().min(20).max(2048),
});
const signupOtpSchema = z.object({ email: z.string().email() });
const forgotPasswordSchema = z.object({ email: z.string().trim().email() });
const resetPasswordSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: z.string().min(8).max(128) });

const ensureNewStoreCanRegister = async () => {
  if (await User.exists({ role: "admin" }) || await StoreSettings.exists({ key: "default" })) {
    return false;
  }
  return true;
};

const existingStoreResponse = (response) => response.status(409).json({
  success: false,
  message: "This API deployment already has a store or admin account. A separate business needs its own customer API deployment and database.",
});

const hashOtp = (email, otp, secret) => crypto.createHmac("sha256", secret).update(`${email}:${otp}`).digest("hex");
const hashResetToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
let adminRegistrationInProgress = false;
const getSubscriptionForAuthentication = async (user) => {
  try {
    return await getSubscriptionForUser(user);
  } catch (error) {
    console.error("Unable to load subscription status during authentication:", error);
    return null;
  }
};
const populateUserLocationForAuthentication = async (user) => {
  try {
    await user.populate("location", "name city");
  } catch (error) {
    console.error("Unable to load user location during authentication:", error);
    user.location = null;
  }
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  ...(user.role === "customer" ? { customerType: user.customerType || "B2C", businessName: user.businessName || "", gstin: user.gstin || "" } : {}),
  ...(user.role !== "customer" ? { location: user.location || null } : {}),
  ...(Array.isArray(user.menuPermissions) ? { menuPermissions: user.menuPermissions } : {}),
});

const setAuthCookie = (response, user, env) => {
  const token = jwt.sign(
    { id: user._id.toString(), role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );

  response.cookie("accessToken", token, {
    httpOnly: true,
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const parseBody = (schema, request, response) => {
  const result = schema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({
      success: false,
      message: "Please check the submitted details.",
      errors: result.error.flatten().fieldErrors,
    });
    return null;
  }
  return result.data;
};

const createLoginHandler = (allowedRoles) => async (request, response, next) => {
  let authStage = "validating credentials";
  try {
    const data = parseBody(credentialsSchema, request, response);
    if (!data) return;

    authStage = "looking up account";
    const user = await User.findOne({ email: data.email.toLowerCase() }).select("+password");
    const isStaffLogin = allowedRoles?.some((role) => ["admin", "manager", "user"].includes(role));
    const clientCredential = isStaffLogin
      ? await getClientCredential(data.email, request.app.locals.env)
      : null;
    authStage = "verifying password";
    const validPassword = user
      && (!isStaffLogin || clientCredential)
      && await bcrypt.compare(data.password, user.password)
      && (!isStaffLogin || await bcrypt.compare(data.password, clientCredential.passwordHash));
    if (!validPassword) {
      return response.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (user.status === "Blocked") {
      return response.status(403).json({ success: false, message: "This account is blocked. Contact an administrator." });
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return response.status(403).json({ success: false, message: "These credentials cannot be used on this sign-in page." });
    }

    authStage = "loading store location";
    await populateUserLocationForAuthentication(user);
    authStage = "creating login session";
    setAuthCookie(response, user, request.app.locals.env);
    const serializedUser = publicUser(user);
    if (["admin", "manager", "user"].includes(user.role)) {
      authStage = "loading subscription status";
      serializedUser.subscription = await getSubscriptionForAuthentication(user);
    }
    return response.json({ success: true, user: serializedUser });
  } catch (error) {
    console.error(`Sign-in failed while ${authStage}:`, error.name, error.message);
    return next(error);
  }
};

router.post("/register", async (request, response, next) => {
  try {
    const data = parseBody(registrationSchema, request, response);
    if (!data) return;

    const email = data.email.toLowerCase();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return response.status(409).json({ success: false, message: "An account with this email already exists." });
    }

    const challenge = await SignupOtp.findOne({ email });
    if (!challenge || challenge.expiresAt <= new Date()) {
      return response.status(400).json({ success: false, message: "Your verification code has expired. Request a new code." });
    }
    if (challenge.attempts >= 5) {
      await challenge.deleteOne();
      return response.status(429).json({ success: false, message: "Too many incorrect codes. Request a new code." });
    }
    const submittedHash = Buffer.from(hashOtp(email, data.otp, request.app.locals.env.JWT_SECRET), "hex");
    const storedHash = Buffer.from(challenge.otpHash, "hex");
    if (submittedHash.length !== storedHash.length || !crypto.timingSafeEqual(submittedHash, storedHash)) {
      challenge.attempts += 1;
      await challenge.save();
      return response.status(400).json({ success: false, message: "The verification code is incorrect." });
    }

    const password = await bcrypt.hash(data.password, 12);
    const user = await User.create({ name: data.name, email, password, customerType: data.customerType, businessName: data.businessName, gstin: data.gstin });
    await challenge.deleteOne();
    setAuthCookie(response, user, request.app.locals.env);
    return response.status(201).json({ success: true, user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/admin-signup-otp", async (request, response, next) => {
  try {
    const data = parseBody(signupOtpSchema, request, response);
    if (!data) return;
    const email = data.email.toLowerCase();
    if (!await ensureNewStoreCanRegister()) return existingStoreResponse(response);
    if (await User.exists({ email })) {
      return response.status(409).json({ success: false, message: "An account with this email already exists." });
    }
    const current = await AdminSignupOtp.findOne({ email });
    if (current && Date.now() - current.createdAt.getTime() < 60_000) {
      return response.status(429).json({ success: false, message: "Please wait before requesting another code." });
    }

    const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const env = request.app.locals.env;
    const sent = await sendSignupCode(email, otp, env);
    await AdminSignupOtp.findOneAndUpdate(
      { email },
      { otpHash: hashOtp(email, otp, env.JWT_SECRET), attempts: 0, expiresAt: new Date(Date.now() + 10 * 60_000) },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return response.json({ success: true, message: "Admin verification code sent.", ...(sent ? {} : { developmentOtp: otp }) });
  } catch (error) {
    if (error.message === "Email delivery is not configured.") {
      return response.status(503).json({ success: false, message: "Signup email delivery is not configured. Contact the store administrator." });
    }
    return next(error);
  }
});

router.post("/register/admin", async (request, response, next) => {
  let env;
  let previousUri;
  let previousSavedUri;
  let user;
  let storeSettingsCreated = false;
  let credentialCreated = false;
  let databaseSwitched = false;
  let subscriptionClaimed = false;
  let subscriptionWasUnassigned = false;
  let subscription;
  let deploymentId;
  try {
    if (adminRegistrationInProgress) {
      return response.status(409).json({ success: false, message: "Another store signup is being processed. Please retry shortly." });
    }
    adminRegistrationInProgress = true;
    const data = parseBody(adminRegistrationSchema, request, response);
    if (!data) return;

    const email = data.email.toLowerCase();
    if (!await ensureNewStoreCanRegister()) return existingStoreResponse(response);
    if (await User.exists({ email })) {
      return response.status(409).json({ success: false, message: "An account with this email already exists." });
    }
    const businessSegment = await BusinessSegment.findOne({ segmentId: data.businessSegmentId.toUpperCase(), enabled: true }).lean();
    if (!businessSegment) {
      return response.status(400).json({ success: false, message: "This business segment is no longer available. Select an active segment and try again." });
    }
    const challenge = await AdminSignupOtp.findOne({ email });
    if (!challenge || challenge.expiresAt <= new Date()) {
      return response.status(400).json({ success: false, message: "Your verification code has expired. Request a new code." });
    }
    if (challenge.attempts >= 5) {
      await challenge.deleteOne();
      return response.status(429).json({ success: false, message: "Too many incorrect codes. Request a new code." });
    }
    const submittedHash = Buffer.from(hashOtp(email, data.otp, request.app.locals.env.JWT_SECRET), "hex");
    const storedHash = Buffer.from(challenge.otpHash, "hex");
    if (submittedHash.length !== storedHash.length || !crypto.timingSafeEqual(submittedHash, storedHash)) {
      challenge.attempts += 1;
      await challenge.save();
      return response.status(400).json({ success: false, message: "The verification code is incorrect." });
    }

    env = request.app.locals.env;
    if (!env.CUSTOMER_DATABASE_ENCRYPTION_KEY) {
      return response.status(503).json({ success: false, message: "Secure customer database setup is unavailable. Contact the platform administrator." });
    }
    subscription = await Subscription.findOne({
      email,
      registrationNumber: data.registrationNumber.toUpperCase(),
    }).select("+licenseKeyHash");
    const submittedLicenseHash = crypto.createHash("sha256").update(data.licenseKey.toUpperCase()).digest();
    const storedLicenseHash = Buffer.from(subscription?.licenseKeyHash || "", "hex");
    const validLicenseKey = storedLicenseHash.length === submittedLicenseHash.length
      && crypto.timingSafeEqual(storedLicenseHash, submittedLicenseHash);
    const currentDate = today();
    if (
      !subscription
      || !validLicenseKey
      || subscription.status !== "Active"
      || subscription.validFrom > currentDate
      || subscription.validTill < currentDate
    ) {
      return response.status(403).json({ success: false, message: "The registration number or license key is invalid, expired, or not assigned to this admin email." });
    }
    deploymentId = getClientDeploymentId(env);
    if (subscription.clientDeploymentId && subscription.clientDeploymentId !== deploymentId) {
      return response.status(409).json({ success: false, message: "This subscription is already assigned to another customer API." });
    }

    try {
      parseAtlasUri(data.customerDatabaseUri);
    } catch (error) {
      return response.status(400).json({ success: false, message: error.message });
    }
    let targetConnection;
    let targetConnectionFailed = false;
    let targetDatabaseHasData = false;
    try {
      targetConnection = await mongoose.createConnection(data.customerDatabaseUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      }).asPromise();
      const collections = await targetConnection.db.listCollections({}, { nameOnly: true }).toArray();
      targetDatabaseHasData = collections.some(({ name }) => !name.startsWith("system."));
    } catch {
      targetConnectionFailed = true;
    }
    if (targetConnection) {
      try {
        await targetConnection.close();
      } catch {
        return response.status(503).json({ success: false, message: "The temporary MongoDB connection could not be closed. Contact the platform administrator." });
      }
    }
    if (targetConnectionFailed) {
      return response.status(400).json({ success: false, message: "Could not connect to the selected MongoDB Atlas database. Check its URI, database user permissions, and Atlas network access." });
    }
    if (targetDatabaseHasData) {
      return response.status(409).json({ success: false, message: "The selected customer database is not empty. Choose a new database to protect its existing data." });
    }

    previousUri = getActiveMongoUri();
    previousSavedUri = await getSavedUri(env.CUSTOMER_DATABASE_ENCRYPTION_KEY);
    subscriptionWasUnassigned = !subscription.clientDeploymentId;
    subscription = await Subscription.findOneAndUpdate(
      {
        _id: subscription._id,
        $or: [{ clientDeploymentId: { $in: ["", null] } }, { clientDeploymentId: deploymentId }],
      },
      { $set: { clientDeploymentId: deploymentId } },
      { new: true },
    ).select("+licenseKeyHash");
    if (!subscription) {
      return response.status(409).json({ success: false, message: "This subscription was assigned to another customer API. Contact Super Admin for assistance." });
    }
    subscriptionClaimed = true;
    try {
      await switchCustomerDatabase(data.customerDatabaseUri);
    } catch {
      const error = new Error("Could not activate the selected customer database. Check Atlas network access and database permissions.");
      error.statusCode = 503;
      throw error;
    }
    databaseSwitched = true;
    await saveUri(data.customerDatabaseUri, env.CUSTOMER_DATABASE_ENCRYPTION_KEY);

    const password = await bcrypt.hash(data.password, 12);
    user = await User.create({
      name: data.name,
      email,
      password,
      role: "admin",
      subscriptionRegistrationNumber: subscription.registrationNumber,
      subscriptionKeyHash: submittedLicenseHash.toString("hex"),
    });
    await StoreSettings.create({
      key: "default",
      businessType: businessSegment.baseProfile,
      businessSegmentId: businessSegment.segmentId,
      businessSegmentCode: businessSegment.code,
      name: data.storeName,
      tagline: data.tagline,
      description: data.storeDescription,
      phone: data.storePhone,
      email: data.storeEmail.toLowerCase(),
      address: data.storeAddress,
      city: data.city,
      deliveryPincode: data.deliveryPincode,
      deliveryFee: data.deliveryFee,
      freeDeliveryAbove: data.freeDeliveryAbove,
      theme: data.theme,
    });
    storeSettingsCreated = true;
    await createClientCredential(email, password, env);
    credentialCreated = true;
    await challenge.deleteOne();
    setAuthCookie(response, user, request.app.locals.env);
    return response.status(201).json({ success: true, user: publicUser(user), message: "Store and admin account created. Your subscription is active." });
  } catch (error) {
    const cleanup = [];
    if (credentialCreated) cleanup.push(deleteClientCredential(user.email, env));
    if (user) cleanup.push(User.deleteOne({ _id: user._id }));
    if (storeSettingsCreated) cleanup.push(StoreSettings.deleteOne({ key: "default" }));
    if (cleanup.length) await Promise.all(cleanup);
    if (databaseSwitched) {
      if (previousSavedUri) await saveUri(previousSavedUri, env.CUSTOMER_DATABASE_ENCRYPTION_KEY);
      else await clearUri(env.CUSTOMER_DATABASE_ENCRYPTION_KEY);
      if (previousUri) await switchCustomerDatabase(previousUri);
    }
    if (subscriptionClaimed && subscriptionWasUnassigned) {
      await Subscription.updateOne(
        { _id: subscription._id, clientDeploymentId: deploymentId },
        { $set: { clientDeploymentId: "" } },
      );
    }
    if (error.code === 11000) {
      return response.status(409).json({
        success: false,
        message: error.keyPattern?.email
          ? "An account with this email already exists."
          : "A store was created on this API at the same time. Sign in or contact the platform administrator.",
      });
    }
    return next(error);
  } finally {
    adminRegistrationInProgress = false;
  }
});

router.post("/signup-otp", async (request, response, next) => {
  try {
    const data = parseBody(signupOtpSchema, request, response);
    if (!data) return;
    const email = data.email.toLowerCase();
    if (await User.exists({ email })) {
      return response.status(409).json({ success: false, message: "An account with this email already exists." });
    }
    const current = await SignupOtp.findOne({ email });
    if (current && Date.now() - current.createdAt.getTime() < 60_000) {
      return response.status(429).json({ success: false, message: "Please wait before requesting another code." });
    }

    const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const env = request.app.locals.env;
    const sent = await sendSignupCode(email, otp, env);
    await SignupOtp.findOneAndUpdate(
      { email },
      { otpHash: hashOtp(email, otp, env.JWT_SECRET), attempts: 0, expiresAt: new Date(Date.now() + 10 * 60_000) },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return response.json({ success: true, message: "Verification code sent.", ...(sent ? {} : { developmentOtp: otp }) });
  } catch (error) {
    if (error.message === "Email delivery is not configured.") {
      return response.status(503).json({ success: false, message: "Signup email delivery is not configured. Contact the store administrator." });
    }
    return next(error);
  }
});

router.post("/forgot-password", async (request, response, next) => {
  try {
    const data = parseBody(forgotPasswordSchema, request, response);
    if (!data) return;
    const env = request.app.locals.env;
    if (env.NODE_ENV === "production" && !isEmailConfigured(env)) {
      return response.status(503).json({ success: false, message: "Password reset email delivery is not configured." });
    }

    const user = await User.findOne({ email: data.email.toLowerCase(), role: "customer" }).select("_id email");
    if (!user) return response.json({ success: true, message: "If an account exists for that email, a reset link will be sent." });

    const existingReset = await PasswordReset.findOne({ user: user._id });
    if (existingReset && Date.now() - existingReset.createdAt.getTime() < 60_000) {
      return response.json({ success: true, message: "If an account exists for that email, a reset link will be sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const resetUrl = new URL(`/reset-password?token=${token}`, env.CLIENT_URL).toString();
    await PasswordReset.findOneAndUpdate(
      { user: user._id },
      { tokenHash: hashResetToken(token), expiresAt: new Date(Date.now() + 60 * 60_000) },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    try {
      const sent = await sendPasswordResetLink(user.email, resetUrl, env);
      return response.json({ success: true, message: "If an account exists for that email, a reset link will be sent.", ...(!sent ? { developmentResetUrl: resetUrl } : {}) });
    } catch (error) {
      await PasswordReset.deleteOne({ user: user._id });
      throw error;
    }
  } catch (error) {
    if (error.message === "Email delivery is not configured.") {
      return response.status(503).json({ success: false, message: "Password reset email delivery is not configured." });
    }
    return next(error);
  }
});

router.post("/admin-forgot-password", async (request, response, next) => {
  try {
    const data = parseBody(forgotPasswordSchema, request, response);
    if (!data) return;
    const env = request.app.locals.env;
    const genericResponse = { success: true, message: "If an admin account exists for that email on this store, a reset link will be sent." };
    if (env.NODE_ENV === "production" && !isEmailConfigured(env)) {
      return response.status(503).json({ success: false, message: "Password reset email delivery is not configured." });
    }

    const user = await User.findOne({
      email: data.email.toLowerCase(),
      role: { $in: ["admin", "manager", "user"] },
    }).select("_id email");
    if (!user) return response.json(genericResponse);
    const clientCredential = await getClientCredential(user.email, env);
    if (!clientCredential) return response.json(genericResponse);

    const existingReset = await PasswordReset.findOne({ user: user._id });
    if (existingReset && Date.now() - existingReset.createdAt.getTime() < 60_000) {
      return response.json(genericResponse);
    }

    const token = crypto.randomBytes(32).toString("hex");
    const resetUrl = new URL(`/admin/reset-password?token=${token}`, env.CLIENT_URL).toString();
    await PasswordReset.findOneAndUpdate(
      { user: user._id },
      { tokenHash: hashResetToken(token), expiresAt: new Date(Date.now() + 60 * 60_000) },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    try {
      const sent = await sendPasswordResetLink(user.email, resetUrl, env);
      return response.json({ ...genericResponse, ...(!sent ? { developmentResetUrl: resetUrl } : {}) });
    } catch (error) {
      await PasswordReset.deleteOne({ user: user._id });
      throw error;
    }
  } catch (error) {
    if (error.message === "Email delivery is not configured.") {
      return response.status(503).json({ success: false, message: "Password reset email delivery is not configured." });
    }
    return next(error);
  }
});

router.post("/reset-password", async (request, response, next) => {
  try {
    const data = parseBody(resetPasswordSchema, request, response);
    if (!data) return;
    const reset = await PasswordReset.findOne({ tokenHash: hashResetToken(data.token), expiresAt: { $gt: new Date() } });
    if (!reset) return response.status(400).json({ success: false, message: "This reset link is invalid or expired. Request a new one." });
    const user = await User.findOne({ _id: reset.user, role: "customer" });
    if (!user) {
      await reset.deleteOne();
      return response.status(400).json({ success: false, message: "This reset link is invalid or expired. Request a new one." });
    }
    user.password = await bcrypt.hash(data.password, 12);
    await user.save();
    await PasswordReset.deleteMany({ user: user._id });
    response.clearCookie("accessToken", { httpOnly: true, sameSite: request.app.locals.env.NODE_ENV === "production" ? "none" : "lax", secure: request.app.locals.env.NODE_ENV === "production" });
    return response.json({ success: true, message: "Password updated. Sign in with your new password." });
  } catch (error) {
    return next(error);
  }
});

router.post("/admin-reset-password", async (request, response, next) => {
  try {
    const data = parseBody(resetPasswordSchema, request, response);
    if (!data) return;
    const reset = await PasswordReset.findOne({ tokenHash: hashResetToken(data.token), expiresAt: { $gt: new Date() } });
    if (!reset) return response.status(400).json({ success: false, message: "This reset link is invalid or expired. Request a new one." });
    const user = await User.findOne({ _id: reset.user, role: { $in: ["admin", "manager", "user"] } }).select("+password");
    if (!user) {
      await reset.deleteOne();
      return response.status(400).json({ success: false, message: "This reset link is invalid or expired. Request a new one." });
    }
    const previousPasswordHash = user.password;
    const passwordHash = await bcrypt.hash(data.password, 12);
    await updateClientCredentialPassword(user.email, passwordHash, request.app.locals.env);
    try {
      user.password = passwordHash;
      await user.save();
    } catch (error) {
      await updateClientCredentialPassword(user.email, previousPasswordHash, request.app.locals.env);
      throw error;
    }
    await PasswordReset.deleteMany({ user: user._id });
    response.clearCookie("accessToken", { httpOnly: true, sameSite: request.app.locals.env.NODE_ENV === "production" ? "none" : "lax", secure: request.app.locals.env.NODE_ENV === "production" });
    return response.json({ success: true, message: "Admin password updated. Sign in with your new password." });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", createLoginHandler(["customer"]));
router.post("/login/customer", createLoginHandler(["customer"]));
router.post("/login/admin", createLoginHandler(["admin", "manager", "user"]));

router.get("/me", requireAuth, async (request, response, next) => {
  try {
    const user = await User.findById(request.user.id);
    if (!user) {
      return response.status(401).json({ success: false, message: "Account no longer exists." });
    }
    await populateUserLocationForAuthentication(user);
    const serializedUser = publicUser(user);
    if (["admin", "manager", "user"].includes(user.role)) {
      serializedUser.subscription = await getSubscriptionForAuthentication(user);
    }
    return response.json({ success: true, user: serializedUser });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (request, response) => {
  response.clearCookie("accessToken", { httpOnly: true, sameSite: request.app.locals.env.NODE_ENV === "production" ? "none" : "lax", secure: request.app.locals.env.NODE_ENV === "production" });
  response.json({ success: true, message: "Signed out successfully." });
});

module.exports = router;
