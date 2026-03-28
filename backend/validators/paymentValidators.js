const { isNonEmptyString, validateObjectId } = require("./common");

const isValidLuhn = (input = "") => {
  const digits = String(input).replace(/\D/g, "");
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

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

const initiatePaymentValidator = (body) => {
  const bookingError = validateObjectId("bookingId", body.bookingId);
  if (bookingError) return { error: bookingError };

  return {
    value: {
      bookingId: body.bookingId,
      idempotencyKey: isNonEmptyString(body.idempotencyKey) ? body.idempotencyKey : null,
    },
  };
};

const paymentOtpRequestValidator = (body) => {
  if (!isNonEmptyString(body.transactionId)) {
    return { error: "transactionId is required" };
  }

  if (!isNonEmptyString(body.gatewayToken)) {
    return { error: "gatewayToken is required" };
  }

  if (!isNonEmptyString(body.gatewayTokenExpiresAt)) {
    return { error: "gatewayTokenExpiresAt is required" };
  }

  const method = String(body.method || "").toLowerCase();
  if (!["upi", "card", "netbanking"].includes(method)) {
    return { error: "method must be one of: upi, card, netbanking" };
  }

  if (method === "upi" && !isNonEmptyString(body.upiId)) {
    return { error: "upiId is required for UPI payments" };
  }
  if (method === "card") {
    if (!isNonEmptyString(body.cardNumber) || !isValidLuhn(body.cardNumber)) {
      return { error: "Valid cardNumber is required for card payments" };
    }
    if (!isNonEmptyString(body.cardName) || String(body.cardName).trim().length < 2) {
      return { error: "cardName is required for card payments" };
    }
    if (!isNonEmptyString(body.cardExpiry) || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(String(body.cardExpiry).trim())) {
      return { error: "cardExpiry must be in MM/YY format" };
    }
    if (!isNonEmptyString(body.cardCvv) || !/^\d{3,4}$/.test(String(body.cardCvv).trim())) {
      return { error: "cardCvv must be 3 or 4 digits" };
    }
    if (!isNonEmptyString(body.cardType) || !["debit", "credit"].includes(String(body.cardType).toLowerCase())) {
      return { error: "cardType must be debit or credit" };
    }
  }
  if (method === "netbanking" && !isNonEmptyString(body.bankCode)) {
    return { error: "bankCode is required for netbanking payments" };
  }

  return {
    value: {
      transactionId: body.transactionId,
      gatewayToken: body.gatewayToken,
      gatewayTokenExpiresAt: body.gatewayTokenExpiresAt,
      method,
      upiId: body.upiId,
      cardNumber: body.cardNumber,
      cardName: body.cardName,
      cardExpiry: body.cardExpiry,
      cardCvv: body.cardCvv,
      cardType: body.cardType,
      bankCode: body.bankCode,
    },
  };
};

const confirmPaymentValidator = (body) => {
  if (!isNonEmptyString(body.transactionId)) {
    return { error: "transactionId is required" };
  }

  if (!isNonEmptyString(body.gatewayToken)) {
    return { error: "gatewayToken is required" };
  }

  if (!isNonEmptyString(body.gatewayTokenExpiresAt)) {
    return { error: "gatewayTokenExpiresAt is required" };
  }

  if (body.paymentId && !isNonEmptyString(body.paymentId)) {
    return { error: "paymentId must be a non-empty string" };
  }

  if (body.paymentOtp && !/^\d{6}$/.test(String(body.paymentOtp))) {
    return { error: "paymentOtp must be a 6-digit code" };
  }

  if (body.method && !["upi", "card", "netbanking"].includes(String(body.method).toLowerCase())) {
    return { error: "method must be one of: upi, card, netbanking" };
  }

  if (body.forceStatus && !["success", "failed"].includes(String(body.forceStatus).toLowerCase())) {
    return { error: "forceStatus must be success or failed" };
  }

  return {
    value: {
      transactionId: body.transactionId,
      gatewayToken: body.gatewayToken,
      gatewayTokenExpiresAt: body.gatewayTokenExpiresAt,
      paymentId: body.paymentId,
      paymentOtp: body.paymentOtp,
      method: body.method,
      forceStatus: body.forceStatus,
    },
  };
};

const paymentStatusParamValidator = (params) => {
  if (!isNonEmptyString(params.transactionId)) {
    return { error: "transactionId is required" };
  }
  return { value: { transactionId: params.transactionId.trim() } };
};

const paymentWebhookValidator = (body) => {
  if (!isNonEmptyString(body.orderId)) {
    return { error: "orderId is required" };
  }

  if (!isNonEmptyString(body.paymentId)) {
    return { error: "paymentId is required" };
  }

  const status = String(body.status || "").toLowerCase().trim();
  if (!["success", "failed"].includes(status)) {
    return { error: "status must be success or failed" };
  }

  if (!isNonEmptyString(body.signature)) {
    return { error: "signature is required" };
  }

  return {
    value: {
      orderId: body.orderId.trim(),
      paymentId: body.paymentId.trim(),
      status,
      signature: body.signature.trim(),
    },
  };
};

module.exports = {
  createOrderValidator,
  verifyPaymentValidator,
  initiatePaymentValidator,
  paymentOtpRequestValidator,
  confirmPaymentValidator,
  paymentStatusParamValidator,
  paymentWebhookValidator,
};
