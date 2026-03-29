const formatCurrency = (amount) => `INR ${Number(amount || 0).toFixed(2)}`;

const baseLayout = ({ title, subtitle, content }) => `
  <div style="font-family:Arial,sans-serif;background:#0b1220;padding:20px;color:#e2e8f0;">
    <div style="max-width:640px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
      <div style="padding:18px 20px;border-bottom:1px solid #1f2937;">
        <h2 style="margin:0;color:#f8fafc;">${title}</h2>
        ${subtitle ? `<p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">${subtitle}</p>` : ""}
      </div>
      <div style="padding:20px;">${content}</div>
      <div style="padding:14px 20px;border-top:1px solid #1f2937;color:#94a3b8;font-size:12px;">
        CinemaSync automated notification
      </div>
    </div>
  </div>
`;

const buildOtpTemplate = ({ name, otp, purpose, expiresInMinutes }) => {
  const purposeMap = {
    login: "Login verification",
    login_phone: "Login verification",
    email_verification: "Email verification",
    password_reset: "Password reset",
  };
  const purposeText = purposeMap[purpose] || "Verification";
  return {
    subject: `CinemaSync ${purposeText} OTP`,
    text: `Hi ${name}, your OTP is ${otp}. It expires in ${expiresInMinutes} minutes.`,
    html: baseLayout({
      title: `${purposeText} OTP`,
      subtitle: `Hi ${name}, use this code to continue.`,
      content: `
        <p style="margin:0 0 12px;color:#cbd5e1;">Enter this OTP in CinemaSync:</p>
        <div style="font-size:30px;letter-spacing:10px;font-weight:700;color:#22d3ee;margin:8px 0 16px;">${otp}</div>
        <p style="margin:0;color:#94a3b8;">This code expires in ${expiresInMinutes} minutes.</p>
      `,
    }),
  };
};

const buildAccountCreatedTemplate = ({ name }) => ({
  subject: "Welcome to CinemaSync",
  text: `Hi ${name}, your CinemaSync account has been created successfully.`,
  html: baseLayout({
    title: "Account Created",
    subtitle: `Welcome ${name}`,
    content: `
      <p style="margin:0 0 10px;color:#cbd5e1;">Your CinemaSync account is now active.</p>
      <p style="margin:0;color:#94a3b8;">You can discover movies, lock seats, and complete bookings in minutes.</p>
    `,
  }),
});

const buildLoginAlertTemplate = ({ name, ipAddress, userAgent, loginAt }) => ({
  subject: "CinemaSync login alert",
  text: `Hi ${name}, your account logged in at ${loginAt}. If this was not you, reset password immediately.`,
  html: baseLayout({
    title: "Login Alert",
    subtitle: `Hi ${name}, a new login was detected.`,
    content: `
      <p style="margin:0 0 10px;color:#cbd5e1;">If this was you, no action is needed.</p>
      <ul style="margin:0;padding-left:18px;color:#cbd5e1;">
        <li>Time: ${loginAt}</li>
        <li>IP: ${ipAddress || "unknown"}</li>
        <li>Device: ${userAgent || "unknown"}</li>
      </ul>
    `,
  }),
});

const buildBookingConfirmationTemplate = ({ name, ticketCode, movieTitle, theatreName, screenName, showTime, seats, amount }) => ({
  subject: `CinemaSync booking confirmed (${ticketCode})`,
  text: `Hi ${name}, your booking is confirmed. Ticket: ${ticketCode}, Movie: ${movieTitle}, Seats: ${seats.join(", ")}, Amount: ${formatCurrency(amount)}.`,
  html: baseLayout({
    title: "Booking Confirmed",
    subtitle: `Ticket ${ticketCode}`,
    content: `
      <p style="margin:0 0 12px;color:#cbd5e1;">Your payment is successful and ticket is generated.</p>
      <ul style="margin:0;padding-left:18px;color:#cbd5e1;">
        <li>Movie: ${movieTitle}</li>
        <li>Theatre: ${theatreName}</li>
        <li>Screen: ${screenName}</li>
        <li>Show Time: ${showTime}</li>
        <li>Seats: ${seats.join(", ")}</li>
        <li>Total: ${formatCurrency(amount)}</li>
      </ul>
    `,
  }),
});

module.exports = {
  buildOtpTemplate,
  buildAccountCreatedTemplate,
  buildLoginAlertTemplate,
  buildBookingConfirmationTemplate,
};
