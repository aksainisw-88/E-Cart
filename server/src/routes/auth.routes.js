const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");

const User = require("../models/User");
const SignupOtp = require("../models/SignupOtp");
const PasswordReset = require("../models/PasswordReset");
const { requireAuth } = require("../middleware/auth");
const { isEmailConfigured, sendPasswordResetLink, sendSignupCode } = require("../utils/email");

const router = express.Router();
const credentialsSchema = z.object({
  email: z.string().email(),
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
const signupOtpSchema = z.object({ email: z.string().email() });
const forgotPasswordSchema = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: z.string().min(8).max(128) });

const hashOtp = (email, otp, secret) => crypto.createHmac("sha256", secret).update(`${email}:${otp}`).digest("hex");
const hashResetToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  ...(user.role === "customer" ? { customerType: user.customerType || "B2C", businessName: user.businessName || "", gstin: user.gstin || "" } : {}),
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

router.post("/login", async (request, response, next) => {
  try {
    const data = parseBody(credentialsSchema, request, response);
    if (!data) return;

    const user = await User.findOne({ email: data.email.toLowerCase() }).select("+password");
    const validPassword = user && await bcrypt.compare(data.password, user.password);
    if (!validPassword) {
      return response.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (user.status === "Blocked") {
      return response.status(403).json({ success: false, message: "This account is blocked. Contact an administrator." });
    }

    setAuthCookie(response, user, request.app.locals.env);
    return response.json({ success: true, user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (request, response, next) => {
  try {
    const user = await User.findById(request.user.id);
    if (!user) {
      return response.status(401).json({ success: false, message: "Account no longer exists." });
    }
    return response.json({ success: true, user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (request, response) => {
  response.clearCookie("accessToken", { httpOnly: true, sameSite: request.app.locals.env.NODE_ENV === "production" ? "none" : "lax", secure: request.app.locals.env.NODE_ENV === "production" });
  response.json({ success: true, message: "Signed out successfully." });
});

module.exports = router;