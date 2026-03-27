const mongoose = require("mongoose");

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
};

const parsePagination = (query, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(parsePositiveInt(query.limit, defaultLimit), maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

const validateObjectId = (field, value) => {
  if (!isValidObjectId(value)) {
    return `${field} must be a valid ObjectId`;
  }
  return null;
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const safeDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseBoolean = (value, fallback = null) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
};

module.exports = {
  isNonEmptyString,
  parsePositiveInt,
  parsePagination,
  isValidObjectId,
  validateObjectId,
  normalizeEmail,
  safeDate,
  parseBoolean,
};
