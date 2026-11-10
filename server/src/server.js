const dotenv = require("dotenv");

dotenv.config();

const app = require("./app");
const { connectDatabase } = require("./config/database");
const env = require("./config/env");
const { syncExistingStaffCredentials } = require("./utils/clientCredentials");

const startServer = async () => {
  try {
    await connectDatabase(
      env.MONGO_URI,
      env.SUPER_ADMIN_MONGO_URI,
      env.NODE_ENV,
      env.CUSTOMER_DATABASE_ENCRYPTION_KEY,
    );
    const syncedCredentials = await syncExistingStaffCredentials(env);
    if (syncedCredentials) console.log(`Verified ${syncedCredentials} existing staff credential(s) in the Super Admin database`);

    app.listen(env.PORT, () => {
      console.log(`E-Mart API listening on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error);
    process.exit(1);
  }
};

startServer();