const nodemailer = require("nodemailer");

const isEmailConfigured = (env) => Boolean(env.SMTP_HOST && (env.SMTP_FROM || env.SMTP_USER));

const createTransporter = (env) => nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE === "true",
  ...(env.SMTP_USER && env.SMTP_PASS ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } } : {}),
});

const sendSignupCode = async (email, code, env) => {
  const from = env.SMTP_FROM || env.SMTP_USER;
  if (!isEmailConfigured(env)) {
    if (env.NODE_ENV !== "production") return false;
    throw new Error("Email delivery is not configured.");
  }

  await createTransporter(env).sendMail({
    from,
    to: email,
    subject: "Your E-Mart verification code",
    text: `Your E-Mart signup verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    html: `<p>Your E-Mart signup verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>`,
  });
  return true;
};

const sendInventoryResetCode = async (email, code, env) => {
  const from = env.SMTP_FROM || env.SMTP_USER;
  if (!isEmailConfigured(env)) {
    if (env.NODE_ENV !== "production") return false;
    throw new Error("Email delivery is not configured.");
  }

  await createTransporter(env).sendMail({
    from,
    to: email,
    subject: "Inventory reset confirmation code",
    text: `Your inventory reset confirmation code is ${code}. It expires in 10 minutes. If you did not request this, contact your store administrator immediately.`,
    html: `<p>Your inventory reset confirmation code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not request this reset, contact your store administrator immediately.</p>`,
  });
  return true;
};

const sendPasswordResetLink = async (email, resetUrl, env) => {
  const from = env.SMTP_FROM || env.SMTP_USER;
  if (!isEmailConfigured(env)) {
    if (env.NODE_ENV !== "production") return false;
    throw new Error("Email delivery is not configured.");
  }

  await createTransporter(env).sendMail({
    from,
    to: email,
    subject: "Reset your E-Mart password",
    text: `Use this link to reset your E-Mart password: ${resetUrl}. The link expires in one hour. If you did not request a reset, you can ignore this email.`,
    html: `<p>We received a request to reset your E-Mart password.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in one hour. If you did not request a reset, you can ignore this email.</p>`,
  });
  return true;
};

module.exports = { isEmailConfigured, sendPasswordResetLink, sendSignupCode, sendInventoryResetCode };