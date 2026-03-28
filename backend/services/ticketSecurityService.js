const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");

const QR_SCHEME = "cinemasync://ticket/scan";
const SCAN_OPEN_MINUTES_BEFORE = Math.max(Number(process.env.TICKET_SCAN_OPEN_MINUTES_BEFORE || 30), 0);
const SCAN_CLOSE_MINUTES_AFTER = Math.max(Number(process.env.TICKET_SCAN_CLOSE_MINUTES_AFTER || 0), 0);

const resolveQrSecret = () => {
  const secret = process.env.TICKET_QR_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new ApiError(500, "Ticket QR secret is not configured");
  }
  return secret;
};

const getScanWindow = (showTime) => {
  const show = new Date(showTime);
  if (Number.isNaN(show.getTime())) {
    throw new ApiError(500, "Ticket show time is invalid");
  }

  const openAt = new Date(show.getTime() - SCAN_OPEN_MINUTES_BEFORE * 60 * 1000);
  const closeAt = new Date(show.getTime() + SCAN_CLOSE_MINUTES_AFTER * 60 * 1000);
  return { openAt, closeAt };
};

const buildSignedQrData = ({ ticketCode, bookingId, userId, showTime }) => {
  const { openAt, closeAt } = getScanWindow(showTime);
  const token = jwt.sign(
    {
      typ: "ticket_scan",
      tc: String(ticketCode),
      bid: String(bookingId),
      uid: String(userId),
      nbf: Math.floor(openAt.getTime() / 1000),
      exp: Math.floor(closeAt.getTime() / 1000),
    },
    resolveQrSecret(),
    { algorithm: "HS256" }
  );

  return `${QR_SCHEME}?token=${encodeURIComponent(token)}`;
};

const extractTokenFromQrData = (qrData) => {
  const raw = String(qrData || "").trim();
  if (!raw) {
    throw new ApiError(400, "qrData is required");
  }

  const tokenPairMatch = raw.match(/[?&]token=([^&]+)/i);
  if (tokenPairMatch?.[1]) {
    return decodeURIComponent(tokenPairMatch[1]);
  }

  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(raw)) {
    return raw;
  }

  throw new ApiError(400, "Ticket QR is malformed");
};

const verifySignedQrData = (qrData) => {
  const token = extractTokenFromQrData(qrData);
  const claims = jwt.verify(token, resolveQrSecret(), { algorithms: ["HS256"] });

  if (claims?.typ !== "ticket_scan" || !claims?.tc || !claims?.bid || !claims?.uid) {
    throw new ApiError(401, "Ticket QR signature payload is invalid");
  }

  return { token, claims };
};

module.exports = {
  buildSignedQrData,
  verifySignedQrData,
  getScanWindow,
  SCAN_OPEN_MINUTES_BEFORE,
  SCAN_CLOSE_MINUTES_AFTER,
};
