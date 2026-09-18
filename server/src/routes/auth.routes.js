const bcrypt = require("bcryptjs");
const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");

const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
const registrationSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(80),
});

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
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

    const password = await bcrypt.hash(data.password, 12);
    const user = await User.create({ name: data.name, email, password });
    setAuthCookie(response, user, request.app.locals.env);
    return response.status(201).json({ success: true, user: publicUser(user) });
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