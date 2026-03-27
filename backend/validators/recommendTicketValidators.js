const { isNonEmptyString, parsePagination, validateObjectId } = require("./common");

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

module.exports = {
  recommendValidator,
  ticketBookingParamValidator,
  ticketCodeParamValidator,
  ticketPaginationValidator,
};
