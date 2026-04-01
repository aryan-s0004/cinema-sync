const { isNonEmptyString, normalizeEmail, normalizePhone } = require("./common");

const isValidPhone = (value) => /^\+?[1-9]\d{7,14}$/.test(value);

const registerValidator = (body) => {
  const { name, email, password } = body;

  if (!isNonEmptyString(name)) {
    return { error: "name is required" };
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { error: "Valid email is required" };
  }

  if (!isNonEmptyString(password) || password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const normalizedPhone = normalizePhone(body?.phone || "");
  if (normalizedPhone && !isValidPhone(normalizedPhone)) {
    return { error: "phone must be in international format (for example +919876543210)" };
  }

  return {
    value: {
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: normalizedPhone || undefined,
    },
  };
};

const loginValidator = (body) => {
  const { email, password } = body;

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { error: "Valid email is required" };
  }

  if (!isNonEmptyString(password)) {
    return { error: "password is required" };
  }

  const channel = String(body?.channel || "email").trim().toLowerCase();
  if (!["email", "phone"].includes(channel)) {
    return { error: "channel must be email or phone" };
  }

  return {
    value: {
      email: normalizedEmail,
      password,
      channel,
    },
  };
};

const loginOtpRequestValidator = (body) => {
  const normalizedEmail = normalizeEmail(body.email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { error: "Valid email is required" };
  }

  const channel = String(body?.channel || "email").trim().toLowerCase();
  if (!["email", "phone"].includes(channel)) {
    return { error: "channel must be email or phone" };
  }

  return { value: { email: normalizedEmail, channel } };
};

const refreshValidator = (body) => {
  if (!isNonEmptyString(body.refreshToken)) {
    return { error: "refreshToken is required" };
  }

  return { value: { refreshToken: body.refreshToken } };
};

const otpVerifyValidator = (body) => {
  const normalizedEmail = normalizeEmail(body.email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { error: "Valid email is required" };
  }

  const channel = String(body?.channel || "email").trim().toLowerCase();
  if (!["email", "phone"].includes(channel)) {
    return { error: "channel must be email or phone" };
  }

  const otp = String(body.otp || "").trim();
  if (!/^\d{6}$/.test(otp)) {
    return { error: "otp must be a 6-digit code" };
  }

  return { value: { email: normalizedEmail, otp, channel } };
};

const forgotPasswordValidator = (body) => {
  const normalizedEmail = normalizeEmail(body.email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { error: "Valid email is required" };
  }

  return { value: { email: normalizedEmail } };
};

const verifyForgotPasswordOTPValidator = (body) => {
  const normalizedEmail = normalizeEmail(body.email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { error: "Valid email is required" };
  }

  const otp = String(body.otp || "").trim();
  if (!/^\d{6}$/.test(otp)) {
    return { error: "otp must be a 6-digit code" };
  }

  return { value: { email: normalizedEmail, otp } };
};

const resetPasswordValidator = (body) => {
  const resetToken = String(body.resetToken || "").trim();
  const newPassword = String(body.newPassword || "");
  if (!isNonEmptyString(newPassword) || newPassword.length < 6) {
    return { error: "newPassword must be at least 6 characters" };
  }

  if (isNonEmptyString(resetToken)) {
    return {
      value: {
        resetToken,
        newPassword,
      },
    };
  }

  const normalizedEmail = normalizeEmail(body.email);
  const otp = String(body.otp || "").trim();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { error: "Valid email is required when resetToken is not provided" };
  }

  if (!/^\d{6}$/.test(otp)) {
    return { error: "otp must be a 6-digit code when resetToken is not provided" };
  }

  return {
    value: {
      email: normalizedEmail,
      otp,
      newPassword,
    },
  };
};

const otpResendValidator = (body) => {
  const normalizedEmail = normalizeEmail(body.email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { error: "Valid email is required" };
  }

  const purpose = String(body.purpose || "").trim();
  if (!["login", "email_verification", "login_phone", "password_reset"].includes(purpose)) {
    return { error: "purpose must be login, login_phone, password_reset or email_verification" };
  }

  const channel = String(body?.channel || (purpose === "login_phone" ? "phone" : "email")).trim().toLowerCase();
  if (!["email", "phone"].includes(channel)) {
    return { error: "channel must be email or phone" };
  }

  return { value: { email: normalizedEmail, purpose, channel } };
};

const googleAuthValidator = (body) => {
  const token = String(body?.token || "").trim();
  if (!token) {
    return { error: "token is required" };
  }

  return { value: { token } };
};

module.exports = {
  registerValidator,
  loginValidator,
  loginOtpRequestValidator,
  refreshValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  verifyForgotPasswordOTPValidator,
  otpVerifyValidator,
  otpResendValidator,
  googleAuthValidator,
};
