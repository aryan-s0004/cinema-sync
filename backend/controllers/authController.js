const jwt = require("jsonwebtoken");
const crypto = require("crypto");
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

const signAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || "15m",
  });

const signRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d",
  });

const OTP_EXPIRY_MINUTES = Math.max(Number(process.env.OTP_EXPIRY_MINUTES || 5), 2);
const OTP_MIN_RESEND_SECONDS = Math.max(Number(process.env.OTP_MIN_RESEND_SECONDS || 30), 15);
const OTP_MAX_ATTEMPTS = 5;
const isDevLike = process.env.NODE_ENV !== "production";

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

const setUserOtp = async (user, purpose) => {
  const now = Date.now();
  if (
    user.otp?.purpose === purpose &&
    user.otp?.lastSentAt &&
    now - new Date(user.otp.lastSentAt).getTime() < OTP_MIN_RESEND_SECONDS * 1000
  ) {
    throw new ApiError(429, `Please wait ${OTP_MIN_RESEND_SECONDS} seconds before requesting a new OTP`);
  }

  const otp = generateOtp();
  const expiresAt = new Date(now + OTP_EXPIRY_MINUTES * 60 * 1000);
  user.otp = {
    hash: hashOtp(otp),
    purpose,
    expiresAt,
    attempts: 0,
    lastSentAt: new Date(now),
  };
  await user.save();

  return { otp, expiresAt };
};

const verifyStoredOtp = async ({ user, otp, purpose }) => {
  const now = Date.now();
  if (!user.otp?.hash || user.otp?.purpose !== purpose) {
    throw new ApiError(400, "No OTP request found. Request OTP first.");
  }

  if (!user.otp.expiresAt || new Date(user.otp.expiresAt).getTime() < now) {
    throw new ApiError(400, "OTP expired. Please request a new OTP.");
  }

  if ((user.otp.attempts || 0) >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, "Too many invalid OTP attempts. Request a new OTP.");
  }

  const valid = hashOtp(otp) === user.otp.hash;
  if (!valid) {
    user.otp.attempts = Number(user.otp.attempts || 0) + 1;
    await user.save();
    throw new ApiError(400, "Invalid OTP");
  }
};

const clearUserOtp = async (user) => {
  user.otp = {
    hash: null,
    purpose: null,
    expiresAt: null,
    attempts: 0,
    lastSentAt: null,
  };
  await user.save();
};

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      throw new ApiError(400, "Name, email and password are required");
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      throw new ApiError(409, "User already exists");
    }

    const user = await User.create({ name, email, password });
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
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          accessToken,
          refreshToken,
          emailVerification: {
            required: true,
            expiresAt: otpData.expiresAt,
            deliveryMode: otpDelivery.mode,
            smtpConfigured: hasSmtpCredentials(),
            otpPreview: otpDelivery.delivered || !isDevLike ? undefined : otpData.otp,
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
    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.matchPassword(password))) {
      throw new ApiError(401, "Invalid credentials");
    }

    const otpData = await setUserOtp(user, "login");
    const otpDelivery = await sendOtpEmail({
      to: user.email,
      name: user.name,
      otp: otpData.otp,
      purpose: "login",
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    }).catch(() => ({ delivered: false, mode: "error" }));

    if (!otpDelivery.delivered && !isDevLike) {
      throw new ApiError(503, "OTP delivery failed. Please try again.");
    }

    res.json(new ApiResponse(200, {
      otpRequired: true,
      email: user.email,
      expiresAt: otpData.expiresAt,
      deliveryMode: otpDelivery.mode,
      smtpConfigured: hasSmtpCredentials(),
      otpPreview: otpDelivery.delivered || !isDevLike ? undefined : otpData.otp,
    }, "OTP sent for login verification"));
  } catch (error) {
    next(error);
  }
};

const verifyLoginOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    await verifyStoredOtp({ user, otp, purpose: "login" });
    await clearUserOtp(user);

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
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified,
          },
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

    await verifyStoredOtp({ user, otp, purpose: "email_verification" });
    user.emailVerified = true;
    await clearUserOtp(user);

    res.json(new ApiResponse(200, { emailVerified: true }, "Email verified successfully"));
  } catch (error) {
    next(error);
  }
};

const resendOtp = async (req, res, next) => {
  try {
    const { email, purpose } = req.body;
    const validPurposes = ["login", "email_verification"];
    if (!validPurposes.includes(purpose)) {
      throw new ApiError(400, `purpose must be one of: ${validPurposes.join(", ")}`);
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const otpData = await setUserOtp(user, purpose);
    const otpDelivery = await sendOtpEmail({
      to: user.email,
      name: user.name,
      otp: otpData.otp,
      purpose,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    }).catch(() => ({ delivered: false, mode: "error" }));

    if (!otpDelivery.delivered && !isDevLike) {
      throw new ApiError(503, "OTP delivery failed. Please try again.");
    }

    res.json(
      new ApiResponse(
        200,
        {
          email: user.email,
          purpose,
          expiresAt: otpData.expiresAt,
          deliveryMode: otpDelivery.mode,
          smtpConfigured: hasSmtpCredentials(),
          otpPreview: otpDelivery.delivered || !isDevLike ? undefined : otpData.otp,
        },
        "OTP resent"
      )
    );
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
  verifyLoginOtp,
  verifyAccountOtp,
  resendOtp,
  getEmailHealth,
  sendEmailTest,
  refreshAccessToken,
  getMe,
  logoutUser,
};
