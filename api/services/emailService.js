let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch (_error) {
  nodemailer = null;
}

const logger = require("../utils/logger");
const {
  buildOtpTemplate,
  buildAccountCreatedTemplate,
  buildLoginAlertTemplate,
  buildBookingConfirmationTemplate,
} = require("./emailTemplates");

const resolveEmailUser = () => (process.env.EMAIL_USER || process.env.EMAIL || "").trim();
const resolveEmailPass = () => (process.env.EMAIL_PASS || process.env.APP_PASSWORD || "").trim();
const hasSmtpCredentials = () => Boolean(resolveEmailUser() && resolveEmailPass());

let cachedTransporter = null;
let transporterVerified = false;

const createTransporter = () => {
  if (cachedTransporter) return cachedTransporter;
  if (!nodemailer) return null;

  const smtpUser = resolveEmailUser();
  const smtpPass = resolveEmailPass();
  const smtpHost = (process.env.SMTP_HOST || "").trim();

  if (smtpHost) {
    cachedTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    });
    return cachedTransporter;
  }

  if (smtpUser && smtpPass) {
    cachedTransporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: { user: smtpUser, pass: smtpPass },
    });
  }

  return cachedTransporter;
};

const verifyTransporter = async () => {
  if (transporterVerified) return;

  const transporter = createTransporter();
  if (!transporter) {
    logger.warn("SMTP is not configured; email service will fall back to logs");
    return;
  }

  await transporter.verify();
  transporterVerified = true;
  logger.info("SMTP transporter verified", {
    provider: process.env.EMAIL_SERVICE || process.env.SMTP_HOST || "custom",
  });
};

setImmediate(() => {
  verifyTransporter().catch((error) => {
    logger.warn("SMTP verification skipped", { message: error.message });
  });
});

const EMAIL_FALLBACK_TO_LOG = String(process.env.EMAIL_FALLBACK_TO_LOG || "true").toLowerCase() === "true";

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    throw new Error("Recipient email is required");
  }

  const transporter = createTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || resolveEmailUser(),
        to,
        subject,
        text,
        html,
      });
      logger.info("Email sent", { to, subject, messageId: info.messageId });
      return { delivered: true, mode: "smtp" };
    } catch (error) {
      logger.error("Email delivery failed", { to, subject, message: error.message });
      if (!EMAIL_FALLBACK_TO_LOG) {
        throw error;
      }
    }
  }

  if (!EMAIL_FALLBACK_TO_LOG) {
    throw new Error("Email transport not configured and fallback disabled");
  }

  logger.warn("Email fallback", {
    to,
    subject,
    preview: text ? text.slice(0, 120) : null,
  });
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

const sendAdminPaymentNotification = async ({
  customerName,
  customerEmail,
  amount,
  transactionId,
  movieTitle,
}) => {
  const adminEmail = String(process.env.ADMIN_NOTIFICATION_EMAIL || "").trim();
  if (!adminEmail) {
    return { delivered: false, mode: "skipped" };
  }

  return sendEmail({
    to: adminEmail,
    subject: `New payment received: ${movieTitle}`,
    text: `Customer ${customerName} (${customerEmail}) paid INR ${amount}. Transaction ${transactionId}.`,
    html: `
      <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
        <h2>New Payment Captured</h2>
        <p>A new CinemaSync booking has been confirmed.</p>
        <p><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
        <p><strong>Movie:</strong> ${movieTitle}</p>
        <p><strong>Amount:</strong> INR ${amount}</p>
        <p><strong>Transaction ID:</strong> ${transactionId}</p>
      </div>
    `,
  });
};

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendAccountCreatedEmail,
  sendLoginAlertEmail,
  sendBookingConfirmationEmail,
  sendAdminPaymentNotification,
  hasSmtpCredentials,
  verifyTransporter,
};
