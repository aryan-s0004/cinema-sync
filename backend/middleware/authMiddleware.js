const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

const protect = async (req, _res, next) => {
  try {
    if (!process.env.JWT_ACCESS_SECRET) {
      throw new ApiError(500, "JWT_ACCESS_SECRET is not configured");
    }

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Authorization token missing");
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(payload.id).select("-password -refreshToken");
    if (!user) {
      throw new ApiError(401, "User not found for token");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, "Invalid or expired token"));
  }
};

const adminOnly = (req, _res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new ApiError(403, "Admin access required"));
  }
  next();
};

module.exports = { protect, adminOnly };
