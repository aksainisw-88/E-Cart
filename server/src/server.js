const dotenv = require("dotenv");

dotenv.config();

const app = require("./app");
const { connectDatabase } = require("./config/database");
const env = require("./config/env");

const startServer = async () => {
  try {
    await connectDatabase(env.MONGO_URI);

    app.listen(env.PORT, () => {
      console.log(`E-Mart API listening on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error);
    process.exit(1);
  }
};

startServer();