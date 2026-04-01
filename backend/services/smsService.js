const axios = require("axios");
const logger = require("../utils/logger");

let twilio = null;
try {
  // Optional dependency: install twilio to use provider directly.
  // eslint-disable-next-line global-require
  twilio = require("twilio");
} catch (_err) {
  twilio = null;
}

const SMS_FALLBACK_TO_LOG = String(process.env.SMS_FALLBACK_TO_LOG || "true").toLowerCase() === "true";

const hasTwilioCredentials = () =>
  Boolean(
    (process.env.TWILIO_ACCOUNT_SID || "").trim() &&
      (process.env.TWILIO_AUTH_TOKEN || "").trim() &&
      (process.env.TWILIO_PHONE_NUMBER || "").trim()
  );

const hasFast2SmsCredentials = () => Boolean((process.env.FAST2SMS_API_KEY || "").trim());

const hasSmsCredentials = () => hasTwilioCredentials() || hasFast2SmsCredentials();

const sendViaTwilio = async ({ to, text }) => {
  if (!twilio || !hasTwilioCredentials()) {
    return { delivered: false, mode: "twilio_unavailable" };
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID.trim(), process.env.TWILIO_AUTH_TOKEN.trim());
  await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER.trim(),
    to,
    body: text,
  });

  return { delivered: true, mode: "twilio" };
};

const sendViaFast2Sms = async ({ to, text }) => {
  if (!hasFast2SmsCredentials()) {
    return { delivered: false, mode: "fast2sms_unavailable" };
  }

  await axios.post(
    "https://www.fast2sms.com/dev/bulkV2",
    {
      route: "v3",
      sender_id: process.env.FAST2SMS_SENDER_ID || "TXTIND",
      message: text,
      language: "english",
      flash: 0,
      numbers: to.replace(/\D/g, ""),
    },
    {
      headers: {
        authorization: process.env.FAST2SMS_API_KEY.trim(),
        "Content-Type": "application/json",
      },
      timeout: 10000,
    }
  );

  return { delivered: true, mode: "fast2sms" };
};

const sendSms = async ({ to, text }) => {
  if (!to) {
    throw new Error("Recipient phone is required");
  }

  if (!text) {
    throw new Error("SMS text is required");
  }

  if (hasTwilioCredentials()) {
    const twilioResult = await sendViaTwilio({ to, text }).catch(() => ({ delivered: false, mode: "twilio_error" }));
    if (twilioResult.delivered) return twilioResult;
  }

  if (hasFast2SmsCredentials()) {
    const fastResult = await sendViaFast2Sms({ to, text }).catch(() => ({ delivered: false, mode: "fast2sms_error" }));
    if (fastResult.delivered) return fastResult;
  }

  if (!SMS_FALLBACK_TO_LOG) {
    throw new Error("SMS provider not configured");
  }

  logger.warn("SMS fallback", { to, text });
  return { delivered: false, mode: "log" };
};

const sendOtpSms = async ({ to, otp, purpose = "login_phone", expiresInMinutes = 5 }) => {
  const text = `CinemaSync OTP: ${otp}. Purpose: ${purpose}. Expires in ${expiresInMinutes} minutes.`;
  return sendSms({ to, text });
};

module.exports = {
  sendSms,
  sendOtpSms,
  hasSmsCredentials,
};
