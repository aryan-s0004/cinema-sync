const express = require("express");
const {
  registerUser,
  loginUser,
  verifyLoginOtp,
  verifyAccountOtp,
  resendOtp,
  getEmailHealth,
  getSmsHealth,
  getProviderHealth,
  sendEmailTest,
  refreshAccessToken,
  getMe,
  logoutUser,
  googleAuth,
} = require("../controllers/authController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  registerValidator,
  loginValidator,
  refreshValidator,
  otpVerifyValidator,
  otpResendValidator,
  googleAuthValidator,
} = require("../validators/authValidators");

const router = express.Router();

router.get("/test", protect, adminOnly, (_req, res) => {
  res.json({ success: true, message: "Auth route is working" });
});
router.get("/email-health", protect, adminOnly, getEmailHealth);
router.get("/sms-health", protect, adminOnly, getSmsHealth);
router.get("/provider-health", protect, adminOnly, getProviderHealth);

router.post("/register", validateRequest({ body: registerValidator }), registerUser);
router.post("/login", validateRequest({ body: loginValidator }), loginUser);
router.post("/google", validateRequest({ body: googleAuthValidator }), googleAuth);
router.post("/login/verify-otp", validateRequest({ body: otpVerifyValidator }), verifyLoginOtp);
router.post("/verify-account-otp", validateRequest({ body: otpVerifyValidator }), verifyAccountOtp);
router.post("/otp/resend", validateRequest({ body: otpResendValidator }), resendOtp);
router.post("/refresh", validateRequest({ body: refreshValidator }), refreshAccessToken);
router.get("/me", protect, getMe);
router.post("/email-test", protect, sendEmailTest);
router.post("/logout", protect, logoutUser);

module.exports = router;
