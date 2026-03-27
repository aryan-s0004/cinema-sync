const { isNonEmptyString, parseBoolean, safeDate, validateObjectId } = require("./common");

const bookingIntentBodyValidator = (body) => {
  const showError = validateObjectId("showId", body.showId);
  if (showError) return { error: showError };

  const allowedSteps = ["seat_selection", "payment", "confirmation"];
  const step = body.step || "seat_selection";
  if (!allowedSteps.includes(step)) {
    return { error: `step must be one of: ${allowedSteps.join(", ")}` };
  }

  if (body.seatIds !== undefined) {
    if (!Array.isArray(body.seatIds)) {
      return { error: "seatIds must be an array" };
    }
    const uniqueSeatIds = [...new Set(body.seatIds.map((id) => String(id)))];
    if (uniqueSeatIds.length > 20) {
      return { error: "seatIds can contain up to 20 seats" };
    }
    const invalidSeat = uniqueSeatIds.find((id) => validateObjectId("seatId", id));
    if (invalidSeat) return { error: "All seatIds must be valid ObjectIds" };
  }

  if (body.bookingId && validateObjectId("bookingId", body.bookingId)) {
    return { error: "bookingId must be a valid ObjectId" };
  }

  if (body.paymentTransactionId !== undefined && !isNonEmptyString(body.paymentTransactionId)) {
    return { error: "paymentTransactionId must be a non-empty string when provided" };
  }

  if (body.lockUntil !== undefined && !safeDate(body.lockUntil)) {
    return { error: "lockUntil must be a valid date string when provided" };
  }

  return {
    value: {
      showId: body.showId,
      seatIds: Array.isArray(body.seatIds) ? [...new Set(body.seatIds.map((id) => String(id)))] : undefined,
      step,
      bookingId: body.bookingId || null,
      paymentTransactionId: body.paymentTransactionId || null,
      lockUntil: body.lockUntil || null,
      active: parseBoolean(body.active, true),
    },
  };
};

const bookingIntentQueryValidator = (query) => {
  if (!query.showId) return { value: query };
  const showError = validateObjectId("showId", query.showId);
  if (showError) return { error: showError };
  return { value: query };
};

const bookingIntentParamValidator = (params) => {
  const error = validateObjectId("id", params.id);
  if (error) return { error };
  return { value: params };
};

module.exports = {
  bookingIntentBodyValidator,
  bookingIntentQueryValidator,
  bookingIntentParamValidator,
};
