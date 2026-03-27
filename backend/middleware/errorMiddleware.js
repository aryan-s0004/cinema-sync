const ApiError = require("../utils/ApiError");

const notFound = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};

const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors: err.errors || null,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

module.exports = { notFound, errorHandler };
