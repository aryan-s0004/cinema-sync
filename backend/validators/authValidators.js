const { isNonEmptyString, normalizeEmail } = require("./common");

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

  return {
    value: {
      name: name.trim(),
      email: normalizedEmail,
      password,
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

  return {
    value: {
      email: normalizedEmail,
      password,
    },
  };
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

  const otp = String(body.otp || "").trim();
  if (!/^\d{6}$/.test(otp)) {
    return { error: "otp must be a 6-digit code" };
  }

  return { value: { email: normalizedEmail, otp } };
};

const otpResendValidator = (body) => {
  const normalizedEmail = normalizeEmail(body.email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { error: "Valid email is required" };
  }

  const purpose = String(body.purpose || "").trim();
  if (!["login", "email_verification"].includes(purpose)) {
    return { error: "purpose must be login or email_verification" };
  }

  return { value: { email: normalizedEmail, purpose } };
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
  refreshValidator,
  otpVerifyValidator,
  otpResendValidator,
  googleAuthValidator,
};
