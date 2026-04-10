const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

const connectDB = require("./config/db");
const app = require("./app");

let bootPromise = null;

module.exports = async (req, res) => {
  try {
    if (!bootPromise) {
      bootPromise = connectDB().catch((error) => {
        bootPromise = null;
        throw error;
      });
    }

    await bootPromise;
    return app(req, res);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        message: error.message || "Server boot failed",
        data: null,
      })
    );
  }
};
