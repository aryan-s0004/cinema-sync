const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const maxRequests = Number(process.env.RATE_LIMIT_MAX || 120);
const cleanupIntervalMs = Math.max(Number(process.env.RATE_LIMIT_CLEANUP_MS || 300_000), windowMs);

const store = new Map();

setInterval(() => {
  const cutoff = Date.now() - windowMs;
  for (const [key, entry] of store.entries()) {
    if (entry.windowStart < cutoff) {
      store.delete(key);
    }
  }
}, cleanupIntervalMs).unref();

const rateLimiter = (req, res, next) => {
  if (req.path === "/api/health") {
    return next();
  }

  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";

  const entry = store.get(key) || { count: 0, windowStart: now };

  if (now - entry.windowStart >= windowMs) {
    entry.count = 0;
    entry.windowStart = now;
  }

  entry.count += 1;
  store.set(key, entry);

  const remaining = Math.max(maxRequests - entry.count, 0);
  res.setHeader("X-RateLimit-Limit", String(maxRequests));
  res.setHeader("X-RateLimit-Remaining", String(remaining));

  if (entry.count > maxRequests) {
    res.setHeader("Retry-After", String(Math.ceil((entry.windowStart + windowMs - now) / 1000)));
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
      data: null,
    });
  }

  return next();
};

module.exports = rateLimiter;
