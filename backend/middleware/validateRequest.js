const ApiError = require("../utils/ApiError");

const normalizeSchema = (schema, legacyPart) => {
  if (typeof schema === "function") {
    return { [legacyPart || "body"]: schema };
  }

  return schema || {};
};

const validateRequest = (schema = {}, legacyPart = null) => (req, _res, next) => {
  const normalizedSchema = normalizeSchema(schema, legacyPart);
  const errors = [];

  for (const part of ["params", "query", "body"]) {
    const validator = normalizedSchema[part];
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
