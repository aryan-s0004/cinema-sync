const express = require("express");
const {
  registerUser,
  loginUser,
  refreshAccessToken,
  getMe,
  logoutUser,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const { registerValidator, loginValidator, refreshValidator } = require("../validators/authValidators");

const router = express.Router();

router.get("/test", (_req, res) => {
  res.json({ success: true, message: "Auth route is working" });
});

router.post("/register", validateRequest({ body: registerValidator }), registerUser);
router.post("/login", validateRequest({ body: loginValidator }), loginUser);
router.post("/refresh", validateRequest({ body: refreshValidator }), refreshAccessToken);
router.get("/me", protect, getMe);
router.post("/logout", protect, logoutUser);

module.exports = router;
