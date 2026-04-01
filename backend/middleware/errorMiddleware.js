const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");

const notFound = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  if (statusCode >= 500) {
    logger.error("Request failed", {
      requestId: req.requestId || null,
      path: req.originalUrl,
      method: req.method,
      message,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors: err.errors || null,
    requestId: req.requestId || null,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

module.exports = { notFound, errorHandler };
