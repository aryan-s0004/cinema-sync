const ApiError = require("../utils/ApiError");

const validateRequest = (schema = {}) => (req, _res, next) => {
  const errors = [];

  for (const part of ["params", "query", "body"]) {
    const validator = schema[part];
    if (!validator) continue;

    const result = validator(req[part] || {});
    if (result?.error) {
      errors.push(result.error);
      continue;
    }

    if (result?.value) {
      req[part] = result.value;
    }
  }

  if (errors.length) {
    return next(new ApiError(400, "Validation failed", errors));
  }

  return next();
};

module.exports = validateRequest;
