let nodemailer = null;
try {
  // Optional dependency. If unavailable, service gracefully falls back to console logging.
  // eslint-disable-next-line global-require
  nodemailer = require("nodemailer");
} catch (_err) {
  nodemailer = null;
}

const sendEmail = async (to, subject, text) => {
  if (!to) {
    throw new Error("Recipient email is required");
  }

  const hasSmtpConfig = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

  if (nodemailer && hasSmtpConfig) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });

    return { delivered: true, mode: "smtp" };
  }

  console.log("[Email Fallback]", { to, subject, text });
  return { delivered: false, mode: "log" };
};

module.exports = { sendEmail };
