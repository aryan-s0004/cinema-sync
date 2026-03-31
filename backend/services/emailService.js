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

/* ── Env helpers ───────────────────────────────────────── */

const resolveEmailUser = () =>
  (process.env.EMAIL_USER || process.env.EMAIL || "").trim();

const resolveEmailPass = () =>
  (process.env.EMAIL_PASS || process.env.APP_PASSWORD || "").trim();

const hasSmtpCredentials = () =>
  Boolean(resolveEmailUser() && resolveEmailPass());

/* ── Cached transporter (created once, reused) ─────────── */

let _cachedTransporter = null;
let _transporterVerified = false;

const createTransporter = () => {
  if (_cachedTransporter) return _cachedTransporter;
  if (!nodemailer) return null;

  const smtpUser = resolveEmailUser();
  const smtpPass = resolveEmailPass();

  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost) {
    _cachedTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: smtpUser && smtpPass
        ? { user: smtpUser, pass: smtpPass }
        : undefined,
    });
    return _cachedTransporter;
  }

  if (smtpUser && smtpPass) {
    _cachedTransporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: { user: smtpUser, pass: smtpPass },
    });
    return _cachedTransporter;
  }

  return null;
};

/**
 * Verify SMTP connection once at startup.
 * Logs a clear message so misconfiguration is obvious in server logs.
 */
const verifyTransporter = async () => {
  if (_transporterVerified) return;

  const transporter = createTransporter();
  if (!transporter) {
    console.warn(
      "[Email] ⚠  No SMTP credentials configured. Emails will fall back to console logging.",
      { EMAIL_USER: resolveEmailUser() ? "set" : "MISSING", EMAIL_PASS: resolveEmailPass() ? "set" : "MISSING" }
    );
    return;
  }

  try {
    await transporter.verify();
    _transporterVerified = true;
    console.log("[Email] ✅ SMTP transporter verified – emails will be delivered via", process.env.EMAIL_SERVICE || process.env.SMTP_HOST || "gmail");
  } catch (err) {
    console.error("[Email] ❌ SMTP verification FAILED:", err.message);
    console.error("[Email]    Check EMAIL_USER, EMAIL_PASS (must be a Google App Password, NOT your regular password).");
    console.error("[Email]    Ensure 2-Step Verification is enabled on the Google account.");
    // Don't throw — allow the server to start; emails will fail at send time with clear errors.
  }
};

// Kick off verification when module is first loaded (non-blocking).
setImmediate(() => { verifyTransporter().catch(() => {}); });

/* ── Core send function ────────────────────────────────── */

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
      console.log("[Email] ✉  Sent to", to, "| subject:", subject, "| messageId:", info.messageId);
      return { delivered: true, mode: "smtp" };
    } catch (err) {
      console.error("[Email] ❌ Failed to send to", to, "| subject:", subject);
      console.error("[Email]    Error:", err.message);

      if (!EMAIL_FALLBACK_TO_LOG) {
        throw err;
      }
      // Fall through to log fallback
    }
  }

  if (!EMAIL_FALLBACK_TO_LOG) {
    throw new Error("Email transport not configured and fallback disabled");
  }

  console.warn("[Email Fallback]", { to, subject, text: text?.substring(0, 100), html: html ? "[html]" : null });
  return { delivered: false, mode: "log" };
};

/* ── Convenience senders ───────────────────────────────── */

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
  movieTitle 
}) => {
  const subject = `🚀 New Payment Received: ${movieTitle}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #10b981;">New Payment Captured</h2>
      <p>A new booking has been confirmed on the CinemaSync platform.</p>
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
        <p><strong>Amount:</strong> ₹${amount}</p>
        <p><strong>Movie:</strong> ${movieTitle}</p>
        <p><strong>Transaction ID:</strong> <code style="background: #e2e8f0; padding: 2px 5px; border-radius: 4px;">${transactionId}</code></p>
      </div>
      <p style="color: #64748b; font-size: 12px;">This is an automated notification for the administrator.</p>
    </div>
  `;
  return sendEmail({ 
    to: "aryancoder999@gmail.com", 
    subject, 
    html,
    text: `New Payment: ${customerName} paid ₹${amount} for ${movieTitle}. Txn ID: ${transactionId}`
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
