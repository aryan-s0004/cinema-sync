const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      // Drop Mongo operators / dotted keys to reduce injection risk.
      if (key.startsWith("$") || key.includes(".")) {
        continue;
      }
      clean[key] = sanitizeValue(val);
    }
    return clean;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
};

const sanitizeRequest = (req, _res, next) => {
  req.body = sanitizeValue(req.body || {});
  req.query = sanitizeValue(req.query || {});
  req.params = sanitizeValue(req.params || {});
  next();
};

module.exports = { sanitizeValue, sanitizeRequest };
