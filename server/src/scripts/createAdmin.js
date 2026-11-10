const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const env = require("../config/env");
const { connectDatabase } = require("../config/database");
const { connection: superAdminConnection } = require("../config/superAdminDatabase");
const { upsertClientCredential } = require("../utils/clientCredentials");

const User = require("../models/User");

const [, , emailArgument, password, ...nameParts] = process.argv;
const email = emailArgument?.toLowerCase();
const name = nameParts.join(" ").trim() || "Store Head";

if (!email || !password || password.length < 8) {
  console.error("Usage: npm run create-admin -- admin@example.com StrongPassword Your Name");
  process.exit(1);
}

const createAdmin = async () => {
  await connectDatabase(env.MONGO_URI, env.SUPER_ADMIN_MONGO_URI, env.NODE_ENV, env.CUSTOMER_DATABASE_ENCRYPTION_KEY);
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.findOneAndUpdate(
    { email },
    { name, email, password: hashedPassword, role: "admin" },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  await upsertClientCredential(email, hashedPassword, env);
  await Promise.all([mongoose.disconnect(), superAdminConnection.close()]);
  console.log(`Admin account ready for ${user.email}`);
};

createAdmin().catch((error) => {
  console.error("Unable to create admin account:", error.message);
  process.exit(1);
});