#!/usr/bin/env node
/**
 * CinemaSync Email Diagnostic Script
 * ────────────────────────────────────
 * Tests SMTP connectivity and sends a real test email.
 *
 * Usage:
 *   node scripts/emailDiagnostic.js                   # checks config only
 *   node scripts/emailDiagnostic.js recipient@gmail.com  # checks + sends test email
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const nodemailer = require("nodemailer");

const ENV_KEYS = ["EMAIL_USER", "EMAIL_PASS", "EMAIL_FROM", "EMAIL_SERVICE"];
const DIVIDER = "─".repeat(52);

const log = (tag, msg) => console.log(`[${tag}]`, msg);
const ok = (msg) => log("  OK ", `✅ ${msg}`);
const fail = (msg) => log("FAIL", `❌ ${msg}`);
const warn = (msg) => log("WARN", `⚠  ${msg}`);

async function main() {
  const recipient = process.argv[2] || null;

  console.log();
  console.log(DIVIDER);
  console.log("  CinemaSync Email Diagnostic");
  console.log(DIVIDER);
  console.log();

  // ── Step 1: Check env vars ────────────────────────
  log("STEP", "1/4 — Checking environment variables...");
  let allSet = true;
  for (const key of ENV_KEYS) {
    const val = (process.env[key] || "").trim();
    if (!val) {
      fail(`${key} is MISSING or empty`);
      allSet = false;
    } else if (key === "EMAIL_PASS" && val === "REPLACE_WITH_YOUR_16_CHAR_APP_PASSWORD") {
      fail(`${key} still has the placeholder value — replace with your real Google App Password`);
      allSet = false;
    } else {
      const display = key === "EMAIL_PASS" ? `${"*".repeat(val.length - 4)}${val.slice(-4)}` : val;
      ok(`${key} = ${display}`);
    }
  }

  if (!allSet) {
    console.log();
    fail("Some env variables are missing. Fix them in backend/.env and re-run.");
    console.log();
    console.log("  How to get a Google App Password:");
    console.log("  1. Go to https://myaccount.google.com/security");
    console.log("  2. Enable 2-Step Verification (if not already)");
    console.log("  3. Go to App Passwords → Generate for 'Mail' / 'Other (CinemaSync)'");
    console.log("  4. Copy the 16-character code into EMAIL_PASS in your .env");
    console.log();
    process.exit(1);
  }

  // ── Step 2: Create transporter ────────────────────
  log("STEP", "2/4 — Creating SMTP transporter...");
  const smtpHost = process.env.SMTP_HOST;
  let transportConfig;

  if (smtpHost) {
    transportConfig = {
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: { user: process.env.EMAIL_USER.trim(), pass: process.env.EMAIL_PASS.trim() },
    };
    ok(`Using custom SMTP: ${smtpHost}:${transportConfig.port}`);
  } else {
    transportConfig = {
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: { user: process.env.EMAIL_USER.trim(), pass: process.env.EMAIL_PASS.trim() },
    };
    ok(`Using service: ${transportConfig.service}`);
  }

  const transporter = nodemailer.createTransport(transportConfig);

  // ── Step 3: Verify connection ─────────────────────
  log("STEP", "3/4 — Verifying SMTP connection...");
  try {
    await transporter.verify();
    ok("SMTP connection verified — credentials are valid!");
  } catch (err) {
    console.log();
    fail(`SMTP verification failed: ${err.message}`);
    console.log();

    if (err.message.includes("Invalid login") || err.message.includes("Username and Password not accepted")) {
      console.log("  This usually means:");
      console.log("  • You are using your regular Gmail password (NOT allowed)");
      console.log("  • You need a Google App Password instead");
      console.log("  • 2-Step Verification may not be enabled on the Google account");
      console.log();
      console.log("  Fix: https://myaccount.google.com/apppasswords");
    } else if (err.message.includes("ECONNREFUSED") || err.message.includes("ETIMEDOUT")) {
      console.log("  This usually means:");
      console.log("  • Your network/firewall is blocking outgoing SMTP connections");
      console.log("  • The SMTP host is unreachable");
    }

    console.log();
    process.exit(1);
  }

  // ── Step 4: Send test email ───────────────────────
  if (!recipient) {
    console.log();
    warn("No recipient provided. Skipping test email send.");
    console.log("  To send a test email: node scripts/emailDiagnostic.js you@gmail.com");
    console.log();
    process.exit(0);
  }

  log("STEP", `4/4 — Sending test email to ${recipient}...`);
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipient,
      subject: "CinemaSync - Email Diagnostic Test",
      text: "If you received this email, your CinemaSync SMTP configuration is working correctly!",
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;padding:20px;background:#0b1220;color:#e2e8f0;">
          <div style="max-width:500px;margin:0 auto;background:#111827;border-radius:12px;padding:24px;border:1px solid #1f2937;">
            <h2 style="margin:0 0 12px;color:#22d3ee;">CinemaSync Email Diagnostic</h2>
            <p style="margin:0 0 8px;color:#cbd5e1;">If you received this email, your SMTP configuration is <b style="color:#4ade80;">working correctly</b>!</p>
            <p style="margin:0;color:#64748b;font-size:12px;">Sent at ${new Date().toISOString()}</p>
          </div>
        </div>
      `,
    });

    console.log();
    ok(`Test email sent! Message ID: ${info.messageId}`);
    console.log();
    console.log("  Check the inbox (and Spam folder) of:", recipient);
    console.log();
  } catch (err) {
    console.log();
    fail(`Failed to send test email: ${err.message}`);
    console.log();
    process.exit(1);
  }
}

main().catch((err) => {
  fail(`Unexpected error: ${err.message}`);
  process.exit(1);
});
