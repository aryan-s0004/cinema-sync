const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    if (process.env.NODE_ENV === "test") return;

    console.log(
      `[${new Date().toISOString()}] [${req.requestId || "-"}] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`
    );
  });

  next();
};

module.exports = requestLogger;
