const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");

if (!process.env.JWT_ACCESS_SECRET && process.env.JWT_SECRET) {
  process.env.JWT_ACCESS_SECRET = process.env.JWT_SECRET;
}

if (!process.env.JWT_REFRESH_SECRET && process.env.JWT_SECRET) {
  process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;
}

if (!process.env.TICKET_QR_SECRET && process.env.JWT_SECRET) {
  process.env.TICKET_QR_SECRET = process.env.JWT_SECRET;
}

const requestLogger = require("./middleware/requestLogger");
const rateLimiter = require("./middleware/rateLimiter");
const requestId = require("./middleware/requestId");
const { sanitizeRequest } = require("./utils/sanitizer");
const { runMaintenanceSweep } = require("./services/bookingExpiryService");
const logger = require("./utils/logger");

const authRoutes = require("./routes/authRoutes");
const movieRoutes = require("./routes/movieRoutes");
const showRoutes = require("./routes/showRoutes");
const seatRoutes = require("./routes/seatRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const bookingIntentRoutes = require("./routes/bookingIntentRoutes");
const stripeRoutes = require("./routes/stripeRoutes");
const recommendRoutes = require("./routes/recommendRoutes");
const ticketRoutes = require("./routes/ticketRoutes");

const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.set("etag", "strong");

const isProduction = process.env.NODE_ENV === "production";
const configuredOrigin = process.env.CLIENT_URL || "";
const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
const allowedOrigins = new Set(
  [configuredOrigin, vercelOrigin, process.env.ALLOWED_ORIGINS]
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!isProduction) {
        return callback(null, true);
      }

      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      if (origin.endsWith(".vercel.app") || origin.endsWith(".vercel.sh")) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin denied"), false);
    },
    credentials: true,
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: isProduction ? undefined : false,
  })
);
app.use(
  compression({
    threshold: 1024,
  })
);
app.use(
  express.json({
    limit: "100kb",
    verify: (req, _res, buf) => {
      // Capture raw body for Stripe webhook signature verification
      if (req.originalUrl.includes("/webhook/stripe")) {
        req.rawBody = buf;
      }
    },
  })
);
app.use(requestId);
app.use(sanitizeRequest);
app.use(rateLimiter);
app.use((req, _res, next) => {
  if (req.path === "/health" || req.path === "/api/health") {
    return next();
  }

  runMaintenanceSweep().catch((error) => {
    logger.warn("Background maintenance sweep skipped", { message: error.message });
  });

  return next();
});

if (process.env.NODE_ENV !== "test") {
  app.use(requestLogger);
}

const healthHandler = (_req, res) => {
  res.json({ success: true, message: "CinemaSync API is healthy", data: { uptime: process.uptime() } });
};

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

if (process.env.NODE_ENV === "test") {
  app.get("/api/test/error", () => {
    throw new Error("Intentional test error");
  });
}

app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/seats", seatRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/booking-intents", bookingIntentRoutes);
app.use("/api/payments", stripeRoutes);
app.use("/api/recommend", recommendRoutes);
app.use("/api/tickets", ticketRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
