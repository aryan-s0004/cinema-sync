const { parsePagination, validateObjectId } = require("./common");

const showIdParamValidator = (params) => {
  const error = validateObjectId("showId", params.showId);
  if (error) return { error };
  return { value: params };
};

const seatLockValidator = (body) => {
  const showError = validateObjectId("showId", body.showId);
  if (showError) return { error: showError };

  if (!Array.isArray(body.seatIds) || body.seatIds.length < 1) {
    return { error: "seatIds must be a non-empty array" };
  }

  if (body.seatIds.length > 20) {
    return { error: "You can lock up to 20 seats at once" };
  }

  const uniqueSeatIds = [...new Set(body.seatIds.map((id) => String(id)))];
  const invalidSeatId = uniqueSeatIds.find((id) => validateObjectId("seatId", id));
  if (invalidSeatId) {
    return { error: "All seatIds must be valid ObjectIds" };
  }

  return {
    value: {
      showId: body.showId,
      seatIds: uniqueSeatIds,
    },
  };
};

const paginationValidator = (query) => {
  const pagination = parsePagination(query, { defaultLimit: 20, maxLimit: 100 });
  return { value: { ...query, ...pagination } };
};

const bookingIdParamValidator = (params) => {
  const error = validateObjectId("id", params.id);
  if (error) return { error };
  return { value: params };
};

module.exports = {
  showIdParamValidator,
  seatLockValidator,
  paginationValidator,
  bookingIdParamValidator,
};
