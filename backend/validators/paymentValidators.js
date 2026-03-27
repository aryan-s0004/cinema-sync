const { isNonEmptyString, validateObjectId } = require("./common");

const createOrderValidator = (body) => {
  const bookingError = validateObjectId("bookingId", body.bookingId);
  if (bookingError) return { error: bookingError };

  return { value: { bookingId: body.bookingId } };
};

const verifyPaymentValidator = (body) => {
  const bookingError = validateObjectId("bookingId", body.bookingId);
  if (bookingError) return { error: bookingError };

  if (body.orderId && !isNonEmptyString(body.orderId)) {
    return { error: "orderId must be a non-empty string" };
  }

  if (body.paymentId && !isNonEmptyString(body.paymentId)) {
    return { error: "paymentId must be a non-empty string" };
  }

  if (body.signature && !isNonEmptyString(body.signature)) {
    return { error: "signature must be a non-empty string" };
  }

  return {
    value: {
      bookingId: body.bookingId,
      orderId: body.orderId,
      paymentId: body.paymentId,
      signature: body.signature,
    },
  };
};

module.exports = {
  createOrderValidator,
  verifyPaymentValidator,
};
