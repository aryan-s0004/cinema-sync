const logger = require("../utils/logger");

const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    if (process.env.NODE_ENV === "test" || req.originalUrl === "/api/health") return;

    logger.info("HTTP request", {
      requestId: req.requestId || "-",
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
    });
  });

  next();
};

module.exports = requestLogger;
