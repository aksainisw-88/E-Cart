const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const { connection } = require("../config/superAdminDatabase");

dotenv.config();

const SuperAdmin = require("../models/SuperAdmin");

const [, , emailArgument, password, ...nameParts] = process.argv;
const email = emailArgument?.toLowerCase();
const name = nameParts.join(" ").trim() || "Super Admin";

if (!email || !password || password.length < 8) {
  console.error("Usage: npm run create-super-admin -- admin@example.com StrongPassword Your Name");
  process.exit(1);
}

const createSuperAdmin = async () => {
  if (!process.env.SUPER_ADMIN_MONGO_URI) throw new Error("SUPER_ADMIN_MONGO_URI is not configured.");
  await connection.openUri(process.env.SUPER_ADMIN_MONGO_URI);
  const exists = await connection.db.listCollections({ name: SuperAdmin.collection.collectionName }, { nameOnly: true }).hasNext();
  if (!exists) await SuperAdmin.createCollection();
  await SuperAdmin.createIndexes();
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await SuperAdmin.findOneAndUpdate(
    { email },
    { name, email, password: hashedPassword, role: "super_admin", status: "Active" },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  await connection.close();
  console.log(`Super-admin account ready for ${user.email}`);
};

createSuperAdmin().catch(async (error) => {
  console.error("Unable to create super-admin account:", error.message);
  if (connection.readyState) await connection.close();
  process.exitCode = 1;
});
