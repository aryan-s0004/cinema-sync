const { isNonEmptyString, parseBoolean, parsePagination, validateObjectId } = require("./common");

const recommendValidator = (body) => {
  const mood = isNonEmptyString(body.mood) ? body.mood : "";
  const genre = isNonEmptyString(body.genre) ? body.genre : "";
  return { value: { mood, genre } };
};

const ticketBookingParamValidator = (params) => {
  const error = validateObjectId("bookingId", params.bookingId);
  if (error) return { error };
  return { value: params };
};

const ticketCodeParamValidator = (params) => {
  if (!isNonEmptyString(params.ticketCode)) {
    return { error: "ticketCode is required" };
  }

  return { value: { ticketCode: params.ticketCode.trim() } };
};

const ticketPaginationValidator = (query) => {
  const pagination = parsePagination(query, { defaultLimit: 20, maxLimit: 100 });
  return { value: { ...query, ...pagination } };
};

const ticketScanValidator = (body) => {
  if (!isNonEmptyString(body.qrData)) {
    return { error: "qrData is required" };
  }

  const consumeRaw = body.consume;
  const consumeParsed = parseBoolean(consumeRaw, null);
  if (consumeRaw !== undefined && consumeParsed === null) {
    return { error: "consume must be true or false" };
  }

  if (body.gate !== undefined && !isNonEmptyString(body.gate)) {
    return { error: "gate must be a non-empty string when provided" };
  }

  if (body.deviceId !== undefined && !isNonEmptyString(body.deviceId)) {
    return { error: "deviceId must be a non-empty string when provided" };
  }

  return {
    value: {
      qrData: body.qrData.trim(),
      consume: consumeRaw === undefined ? true : consumeParsed,
      gate: isNonEmptyString(body.gate) ? body.gate.trim() : null,
      deviceId: isNonEmptyString(body.deviceId) ? body.deviceId.trim() : null,
    },
  };
};

module.exports = {
  recommendValidator,
  ticketBookingParamValidator,
  ticketCodeParamValidator,
  ticketPaginationValidator,
  ticketScanValidator,
};
