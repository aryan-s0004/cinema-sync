const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const requestLogger = require("./middleware/requestLogger");
const rateLimiter = require("./middleware/rateLimiter");
const requestId = require("./middleware/requestId");
const { sanitizeRequest } = require("./utils/sanitizer");

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

app.use(
  cors({
    origin: (origin, callback) => {
      if (!isProduction) {
        return callback(null, true);
      }

      if (!configuredOrigin) {
        return callback(new Error("CLIENT_URL must be configured in production"), false);
      }

      // Allow same-origin server calls and explicit client URL.
      if (!origin || origin === configuredOrigin) {
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

if (process.env.NODE_ENV !== "test") {
  app.use(requestLogger);
}

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "CinemaSync API is healthy", data: { uptime: process.uptime() } });
});

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
