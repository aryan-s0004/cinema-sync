const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const {
  sendOtpEmail,
  sendAccountCreatedEmail,
  sendLoginAlertEmail,
  sendEmail,
  hasSmtpCredentials,
} = require("../services/emailService");
const { sendOtpSms, hasSmsCredentials } = require("../services/smsService");
const { normalizePhone } = require("../validators/common");

const signAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || "15m",
  });

const signRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d",
  });

const mapUserAuthPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || null,
  role: user.role,
  emailVerified: user.emailVerified,
  phoneVerified: user.phoneVerified || false,
  authProvider: user.authProvider || "local",
  avatar: user.avatar || "",
});

const OTP_EXPIRY_MINUTES = Math.max(Number(process.env.OTP_EXPIRY_MINUTES || 5), 2);
const OTP_MIN_RESEND_SECONDS = Math.max(Number(process.env.OTP_MIN_RESEND_SECONDS || 30), 15);
const OTP_MAX_ATTEMPTS = 5;
const isDevLike = process.env.NODE_ENV !== "production";
const OTP_DEBUG_PREVIEW = String(process.env.OTP_DEBUG_PREVIEW || "false").toLowerCase() === "true";
const getOtpPreview = ({ delivered, otp }) => (OTP_DEBUG_PREVIEW && !delivered ? otp : undefined);

let googleClientInstance = null;
const getGoogleClient = () => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new ApiError(500, "GOOGLE_CLIENT_ID is missing");
  }

  if (!googleClientInstance) {
    googleClientInstance = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  return googleClientInstance;
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");
const isValidPhone = (value) => /^\+?[1-9]\d{7,14}$/.test(String(value || ""));
const maskPhone = (value) => {
  const cleaned = String(value || "").replace(/[^\d]/g, "");
  if (cleaned.length < 4) return value || "";
  return `${"*".repeat(Math.max(cleaned.length - 4, 2))}${cleaned.slice(-4)}`;
};
const emptyOtpState = () => ({
  hash: null,
  purpose: null,
  expiresAt: null,
  attempts: 0,
  lastSentAt: null,
});

const setUserOtp = async (user, purpose, field = "otp") => {
  const now = Date.now();
  if (
    user[field]?.purpose === purpose &&
    user[field]?.lastSentAt &&
    now - new Date(user[field].lastSentAt).getTime() < OTP_MIN_RESEND_SECONDS * 1000
  ) {
    throw new ApiError(429, `Please wait ${OTP_MIN_RESEND_SECONDS} seconds before requesting a new OTP`);
  }

  const otp = generateOtp();
  const expiresAt = new Date(now + OTP_EXPIRY_MINUTES * 60 * 1000);
  user[field] = {
    hash: hashOtp(otp),
    purpose,
    expiresAt,
    attempts: 0,
    lastSentAt: new Date(now),
  };
  await user.save();

  return { otp, expiresAt };
};

const verifyStoredOtp = async ({ user, otp, purpose, field = "otp" }) => {
  const now = Date.now();
  if (!user[field]?.hash || user[field]?.purpose !== purpose) {
    throw new ApiError(400, "No OTP request found. Request OTP first.");
  }

  if (!user[field].expiresAt || new Date(user[field].expiresAt).getTime() < now) {
    throw new ApiError(400, "OTP expired. Please request a new OTP.");
  }

  if ((user[field].attempts || 0) >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, "Too many invalid OTP attempts. Request a new OTP.");
  }

  const valid = hashOtp(otp) === user[field].hash;
  if (!valid) {
    user[field].attempts = Number(user[field].attempts || 0) + 1;
    await user.save();
    throw new ApiError(400, "Invalid OTP");
  }
};

const clearUserOtp = async (user, field = "otp") => {
  user[field] = emptyOtpState();
  await user.save();
};

const sendOtpForUser = async ({ user, channel = "email", purpose = "login" }) => {
  if (!["email", "phone"].includes(channel)) {
    throw new ApiError(400, "channel must be email or phone");
  }

  if (channel === "phone" && !user.phone) {
    throw new ApiError(400, "No phone number linked to this account");
  }

  const otpField = channel === "phone" ? "phoneOtp" : "otp";
  const otpPurpose = channel === "phone" ? "login_phone" : purpose;
  const otpData = await setUserOtp(user, otpPurpose, otpField);

  const otpDelivery = channel === "phone"
    ? await sendOtpSms({
        to: user.phone,
        otp: otpData.otp,
        purpose: otpPurpose,
        expiresInMinutes: OTP_EXPIRY_MINUTES,
      }).catch(() => ({ delivered: false, mode: "error" }))
    : await sendOtpEmail({
        to: user.email,
        name: user.name,
        otp: otpData.otp,
        purpose: otpPurpose,
        expiresInMinutes: OTP_EXPIRY_MINUTES,
      }).catch(() => ({ delivered: false, mode: "error" }));

  if (!otpDelivery.delivered && !isDevLike) {
    throw new ApiError(503, `${channel === "phone" ? "SMS" : "Email"} OTP delivery failed. Please try again.`);
  }

  return {
    email: user.email,
    purpose: otpPurpose,
    channel,
    phoneMasked: channel === "phone" ? maskPhone(user.phone) : null,
    expiresAt: otpData.expiresAt,
    deliveryMode: otpDelivery.mode,
    smtpConfigured: channel === "email" ? hasSmtpCredentials() : undefined,
    smsConfigured: channel === "phone" ? hasSmsCredentials() : undefined,
    otpPreview: getOtpPreview({ delivered: otpDelivery.delivered, otp: otpData.otp }),
  };
};

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const phone = normalizePhone(req.body?.phone || "");
    if (!name || !email || !password) {
      throw new ApiError(400, "Name, email and password are required");
    }
    if (phone && !isValidPhone(phone)) {
      throw new ApiError(400, "phone must be in international format (for example +919876543210)");
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      throw new ApiError(409, "User already exists");
    }

    if (phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        throw new ApiError(409, "Phone number already exists");
      }
    }

    const user = await User.create({ name, email, password, phone: phone || undefined });
    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    user.refreshToken = refreshToken;
    const otpData = await setUserOtp(user, "email_verification");

    sendAccountCreatedEmail({ to: user.email, name: user.name }).catch(() => {});
    const otpDelivery = await sendOtpEmail({
      to: user.email,
      name: user.name,
      otp: otpData.otp,
      purpose: "email_verification",
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    }).catch(() => ({ delivered: false, mode: "error" }));

    if (!otpDelivery.delivered && !isDevLike) {
      throw new ApiError(503, "OTP delivery failed. Please contact support.");
    }

    res.status(201).json(
      new ApiResponse(
        201,
        {
          user: mapUserAuthPayload(user),
          accessToken,
          refreshToken,
          emailVerification: {
            required: true,
            expiresAt: otpData.expiresAt,
            deliveryMode: otpDelivery.mode,
            smtpConfigured: hasSmtpCredentials(),
            otpPreview: getOtpPreview({ delivered: otpDelivery.delivered, otp: otpData.otp }),
          },
        },
        "User registered. Verification OTP sent to email."
      )
    );
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const channel = String(req.body?.channel || "email").trim().toLowerCase();
    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }
    if (!["email", "phone"].includes(channel)) {
      throw new ApiError(400, "channel must be email or phone");
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new ApiError(401, "Invalid credentials");
    }

    if (user.authProvider === "google" && user.googleId) {
      throw new ApiError(400, "This account uses Google sign-in. Continue with Google.");
    }

    if (!(await user.matchPassword(password))) {
      throw new ApiError(401, "Invalid credentials");
    }

    const otpPayload = await sendOtpForUser({ user, channel, purpose: "login" });
    res.json(
      new ApiResponse(200, {
        otpRequired: true,
        ...otpPayload,
      }, `OTP sent for ${channel} login verification`)
    );
  } catch (error) {
    next(error);
  }
};

const requestLoginOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const channel = String(req.body?.channel || "email").trim().toLowerCase();
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.authProvider === "google" && user.googleId) {
      throw new ApiError(400, "This account uses Google sign-in. Continue with Google.");
    }

    if (channel === "phone" && !user.phone) {
      throw new ApiError(400, "No phone number linked to this account. Use email OTP or update profile.");
    }

    const otpPayload = await sendOtpForUser({ user, channel, purpose: "login" });
    res.json(
      new ApiResponse(200, {
        otpRequired: true,
        ...otpPayload,
      }, `OTP sent for ${channel} login verification`)
    );
  } catch (error) {
    next(error);
  }
};

const verifyLoginOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const channel = String(req.body?.channel || "email").trim().toLowerCase();
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (channel === "phone") {
      await verifyStoredOtp({ user, otp, purpose: "login_phone", field: "phoneOtp" });
      await clearUserOtp(user, "phoneOtp");
    } else {
      await verifyStoredOtp({ user, otp, purpose: "login", field: "otp" });
      await clearUserOtp(user, "otp");
    }

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    sendLoginAlertEmail({
      to: user.email,
      name: user.name,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      loginAt: new Date().toISOString(),
    }).catch(() => {});

    res.json(
      new ApiResponse(
        200,
        {
          user: mapUserAuthPayload(user),
          accessToken,
          refreshToken,
        },
        "Login successful"
      )
    );
  } catch (error) {
    next(error);
  }
};

const verifyAccountOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    await verifyStoredOtp({ user, otp, purpose: "email_verification", field: "otp" });
    user.emailVerified = true;
    await clearUserOtp(user, "otp");

    res.json(new ApiResponse(200, { emailVerified: true }, "Email verified successfully"));
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || (user.authProvider === "google" && user.googleId)) {
      return res.json(
        new ApiResponse(
          200,
          { requested: true },
          "If an account exists, a reset code has been sent to the email."
        )
      );
    }

    const otpPayload = await sendOtpForUser({
      user,
      channel: "email",
      purpose: "password_reset",
    });

    return res.json(
      new ApiResponse(
        200,
        {
          requested: true,
          email: otpPayload.email,
          expiresAt: otpPayload.expiresAt,
          deliveryMode: otpPayload.deliveryMode,
          smtpConfigured: otpPayload.smtpConfigured,
          otpPreview: otpPayload.otpPreview,
        },
        "If an account exists, a reset code has been sent to the email."
      )
    );
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw new ApiError(404, "User not found");
    }
    if (user.authProvider === "google" && user.googleId) {
      throw new ApiError(400, "This account uses Google sign-in. Continue with Google.");
    }

    await verifyStoredOtp({ user, otp, purpose: "password_reset", field: "otp" });
    user.otp = emptyOtpState();
    user.password = newPassword;
    user.refreshToken = null;
    await user.save();

    res.json(new ApiResponse(200, { reset: true }, "Password updated successfully"));
  } catch (error) {
    next(error);
  }
};

const googleAuth = async (req, res, next) => {
  try {
    const { token } = req.body;
    const googleClient = getGoogleClient();
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload() || {};
    const googleEmail = String(payload.email || "").trim().toLowerCase();
    const googleId = String(payload.sub || "").trim();

    if (!googleEmail || !googleEmail.includes("@")) {
      throw new ApiError(400, "Google account email not available");
    }
    if (!googleId) {
      throw new ApiError(401, "Invalid Google token subject");
    }
    if (payload.email_verified === false) {
      throw new ApiError(401, "Google account email is not verified");
    }

    let user = await User.findOne({ email: googleEmail });

    if (!user) {
      user = await User.create({
        name: payload.name || googleEmail.split("@")[0],
        email: googleEmail,
        authProvider: "google",
        googleId,
        avatar: payload.picture || "",
        emailVerified: true,
      });
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (payload.picture) {
        user.avatar = payload.picture;
      }
      user.emailVerified = true;
      await user.save();
    }

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.json(
      new ApiResponse(
        200,
        {
          user: mapUserAuthPayload(user),
          accessToken,
          refreshToken,
        },
        "Google login successful"
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(new ApiError(401, "Google authentication failed"));
  }
};

const resendOtp = async (req, res, next) => {
  try {
    const { email, purpose } = req.body;
    const channel = String(req.body?.channel || (purpose === "login_phone" ? "phone" : "email")).trim().toLowerCase();
    const validPurposes = ["login", "email_verification", "login_phone", "password_reset"];
    if (!validPurposes.includes(purpose)) {
      throw new ApiError(400, `purpose must be one of: ${validPurposes.join(", ")}`);
    }
    if (!["email", "phone"].includes(channel)) {
      throw new ApiError(400, "channel must be email or phone");
    }
    if (channel === "phone" && purpose !== "login_phone") {
      throw new ApiError(400, "phone channel supports only login_phone purpose");
    }
    if (channel === "email" && purpose === "login_phone") {
      throw new ApiError(400, "login_phone purpose requires phone channel");
    }
    if (purpose === "password_reset" && channel !== "email") {
      throw new ApiError(400, "password_reset purpose supports only email channel");
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    if (channel === "phone" && !user.phone) {
      throw new ApiError(400, "No phone number linked to this account");
    }

    const otpPayload = await sendOtpForUser({
      user,
      channel,
      purpose: purpose === "login_phone" ? "login" : purpose,
    });

    res.json(new ApiResponse(200, otpPayload, "OTP resent"));
  } catch (error) {
    next(error);
  }
};

const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new ApiError(401, "Refresh token is required");
    }

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.id);
    if (!user || user.refreshToken !== refreshToken) {
      throw new ApiError(403, "Invalid refresh token");
    }

    const newAccessToken = signAccessToken(user._id);
    const newRefreshToken = signRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json(
      new ApiResponse(
        200,
        {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
        "Token refreshed"
      )
    );
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(403, "Invalid or expired refresh token"));
  }
};

const getMe = async (req, res, next) => {
  try {
    res.json(new ApiResponse(200, req.user, "Profile fetched"));
  } catch (error) {
    next(error);
  }
};

const logoutUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    res.json(new ApiResponse(200, null, "Logged out"));
  } catch (error) {
    next(error);
  }
};

const getEmailHealth = async (_req, res, next) => {
  try {
    const smtpHost = process.env.SMTP_HOST || null;
    const smtpConfigured = hasSmtpCredentials();
    const provider = smtpHost ? "smtp" : process.env.EMAIL_SERVICE || "gmail";
    res.json(
      new ApiResponse(
        200,
        {
          smtpConfigured,
          provider,
          fallbackToLog: String(process.env.EMAIL_FALLBACK_TO_LOG || "true").toLowerCase() === "true",
        },
        "Email health fetched"
      )
    );
  } catch (error) {
    next(error);
  }
};

const getSmsHealth = async (_req, res, next) => {
  try {
    let provider = "none";
    if ((process.env.TWILIO_ACCOUNT_SID || "").trim()) provider = "twilio";
    else if ((process.env.FAST2SMS_API_KEY || "").trim()) provider = "fast2sms";

    res.json(
      new ApiResponse(
        200,
        {
          smsConfigured: hasSmsCredentials(),
          provider,
          fallbackToLog: String(process.env.SMS_FALLBACK_TO_LOG || "true").toLowerCase() === "true",
        },
        "SMS health fetched"
      )
    );
  } catch (error) {
    next(error);
  }
};

const getProviderHealth = async (_req, res, next) => {
  try {
    const googleClientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
    const smtpHost = process.env.SMTP_HOST || null;
    const emailProvider = smtpHost ? "smtp" : process.env.EMAIL_SERVICE || "gmail";

    let smsProvider = "none";
    if ((process.env.TWILIO_ACCOUNT_SID || "").trim()) smsProvider = "twilio";
    else if ((process.env.FAST2SMS_API_KEY || "").trim()) smsProvider = "fast2sms";

    res.json(
      new ApiResponse(
        200,
        {
          google: {
            configured: Boolean(googleClientId),
            clientIdPreview: googleClientId ? `${googleClientId.slice(0, 12)}...` : null,
          },
          email: {
            configured: hasSmtpCredentials(),
            provider: emailProvider,
            fallbackToLog: String(process.env.EMAIL_FALLBACK_TO_LOG || "true").toLowerCase() === "true",
          },
          sms: {
            configured: hasSmsCredentials(),
            provider: smsProvider,
            fallbackToLog: String(process.env.SMS_FALLBACK_TO_LOG || "true").toLowerCase() === "true",
          },
        },
        "Auth provider health fetched"
      )
    );
  } catch (error) {
    next(error);
  }
};

const sendEmailTest = async (req, res, next) => {
  try {
    const to = req.user?.email;
    if (!to) {
      throw new ApiError(400, "No email found for logged-in user");
    }

    const result = await sendEmail({
      to,
      subject: "CinemaSync email test",
      text: `Hello ${req.user.name || "User"}, this is a CinemaSync email connectivity test.`,
      html: `<p>Hello <b>${req.user.name || "User"}</b>, this is a CinemaSync email connectivity test.</p>`,
    });

    res.json(new ApiResponse(200, { delivered: result.delivered, mode: result.mode, to }, "Test email processed"));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  requestLoginOtp,
  forgotPassword,
  resetPassword,
  googleAuth,
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
};


