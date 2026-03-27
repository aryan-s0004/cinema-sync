const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, ".env") });

const connectDB = require("./config/db");
const app = require("./app");

const start = async () => {
  await connectDB();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`CinemaSync API running on port ${PORT}`);
  });
};

start();
