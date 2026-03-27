let nodemailer = null;
try {
  // Optional dependency. If unavailable, service gracefully falls back to console logging.
  // eslint-disable-next-line global-require
  nodemailer = require("nodemailer");
} catch (_err) {
  nodemailer = null;
}

const {
  buildOtpTemplate,
  buildAccountCreatedTemplate,
  buildLoginAlertTemplate,
  buildBookingConfirmationTemplate,
} = require("./emailTemplates");

const hasSmtpCredentials = () =>
  Boolean((process.env.EMAIL_USER || "").trim() && (process.env.EMAIL_PASS || "").trim());

const createTransporter = () => {
  if (!nodemailer) return null;
  const smtpUser = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : "";
  const smtpPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim() : "";

  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: smtpUser && smtpPass
        ? {
            user: smtpUser,
            pass: smtpPass,
          }
        : undefined,
    });
  }

  if (smtpUser && smtpPass) {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  return null;
};

const EMAIL_FALLBACK_TO_LOG = String(process.env.EMAIL_FALLBACK_TO_LOG || "true").toLowerCase() === "true";

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    throw new Error("Recipient email is required");
  }

  const transporter = createTransporter();

  if (transporter) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    });

    return { delivered: true, mode: "smtp" };
  }

  if (!EMAIL_FALLBACK_TO_LOG) {
    throw new Error("Email transport not configured");
  }

  console.log("[Email Fallback]", { to, subject, text, html: html ? "[html]" : null });
  return { delivered: false, mode: "log" };
};

const sendOtpEmail = async ({ to, name, otp, purpose = "login", expiresInMinutes = 5 }) => {
  const template = buildOtpTemplate({ name, otp, purpose, expiresInMinutes });
  return sendEmail({ to, subject: template.subject, text: template.text, html: template.html });
};

const sendAccountCreatedEmail = async ({ to, name }) => {
  const template = buildAccountCreatedTemplate({ name });
  return sendEmail({ to, subject: template.subject, text: template.text, html: template.html });
};

const sendLoginAlertEmail = async ({ to, name, ipAddress, userAgent, loginAt }) => {
  const template = buildLoginAlertTemplate({ name, ipAddress, userAgent, loginAt });
  return sendEmail({ to, subject: template.subject, text: template.text, html: template.html });
};

const sendBookingConfirmationEmail = async ({
  to,
  name,
  ticketCode,
  movieTitle,
  theatreName,
  screenName,
  showTime,
  seats,
  amount,
}) => {
  const template = buildBookingConfirmationTemplate({
    name,
    ticketCode,
    movieTitle,
    theatreName,
    screenName,
    showTime,
    seats,
    amount,
  });
  return sendEmail({ to, subject: template.subject, text: template.text, html: template.html });
};

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendAccountCreatedEmail,
  sendLoginAlertEmail,
  sendBookingConfirmationEmail,
  hasSmtpCredentials,
};
