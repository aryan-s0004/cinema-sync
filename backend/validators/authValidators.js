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

module.exports = {
  registerValidator,
  loginValidator,
  refreshValidator,
};
