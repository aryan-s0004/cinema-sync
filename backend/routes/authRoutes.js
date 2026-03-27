const express = require("express");
const {
  registerUser,
  loginUser,
  refreshAccessToken,
  getMe,
  logoutUser,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/test", (_req, res) => {
  res.json({ success: true, message: "Auth route is working" });
});

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshAccessToken);
router.get("/me", protect, getMe);
router.post("/logout", protect, logoutUser);

module.exports = router;
