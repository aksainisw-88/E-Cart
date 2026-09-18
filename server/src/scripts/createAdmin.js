const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const User = require("../models/User");

const [, , emailArgument, password, ...nameParts] = process.argv;
const email = emailArgument?.toLowerCase();
const name = nameParts.join(" ").trim() || "Store Head";

if (!email || !password || password.length < 8) {
  console.error("Usage: npm run create-admin -- admin@example.com StrongPassword Your Name");
  process.exit(1);
}

const createAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.findOneAndUpdate(
    { email },
    { name, email, password: hashedPassword, role: "admin" },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  await mongoose.disconnect();
  console.log(`Admin account ready for ${user.email}`);
};

createAdmin().catch((error) => {
  console.error("Unable to create admin account:", error.message);
  process.exit(1);
});