/**
 * Standalone SMTP test script.
 * Run with:  node scripts/test-email.mjs
 *
 * Reads SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS from .env.local
 * Sends a test email to SMTP_USER (yourself) so you can confirm delivery.
 * Does NOT import or modify any application code.
 */

import { readFileSync } from "fs";
import { createTransport } from "nodemailer";

// ── 1. Load .env.local manually (no dotenv dependency needed) ──────────────
function loadEnv() {
  const vars = {};
  try {
    const content = readFileSync(".env.local", "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      vars[key] = value;
    }
  } catch {
    console.error(" Could not read .env.local — make sure you run this from the project root.");
    process.exit(1);
  }
  return vars;
}

const env = loadEnv();

// ── 2. Validate required vars ──────────────────────────────────────────────
const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
const missing = required.filter((k) => !env[k]);

if (missing.length) {
  console.error(` Missing environment variables in .env.local: ${missing.join(", ")}`);
  console.error(`\nMake sure your .env.local has:\n`);
  console.error(`  SMTP_HOST=smtp.gmail.com`);
  console.error(`  SMTP_PORT=587`);
  console.error(`  SMTP_USER=your-email@gmail.com`);
  console.error(`  SMTP_PASS=your-app-password`);
  process.exit(1);
}

const host = env.SMTP_HOST;
const port = Number(env.SMTP_PORT);
const user = env.SMTP_USER;
const pass = env.SMTP_PASS;
const adminEmail = env.ADMIN_ORDER_EMAIL || null;
const sendTo = adminEmail || user; // Send test to admin email if set, otherwise to yourself

console.log("┌─────────────────────────────────────────┐");
console.log("│       Emeritus Gadgets — SMTP Test      │");
console.log("└─────────────────────────────────────────┘");
console.log();
console.log(`  Host:     ${host}`);
console.log(`  Port:     ${port}`);
console.log(`  Secure:   ${port === 465 ? "yes (SSL)" : "no (STARTTLS)"}`);
console.log(`  User:     ${user}`);
console.log(`  Pass:     ${"*".repeat(Math.min(pass.length, 16))}`);
console.log(`  Send to:  ${sendTo}`);
console.log();

// ── 3. Create transporter ──────────────────────────────────────────────────
const transporter = createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

// ── 4. Verify SMTP connection ──────────────────────────────────────────────
console.log("⏳ Step 1/2 — Verifying SMTP connection...");
try {
  await transporter.verify();
  console.log(" SMTP connection successful!\n");
} catch (err) {
  console.error(` SMTP connection FAILED:\n`);
  console.error(`   ${err.message}\n`);
  console.error(`Troubleshooting:`);
  console.error(`  • If using Gmail, ensure you use an App Password (not your account password)`);
  console.error(`    → https://myaccount.google.com/apppasswords`);
  console.error(`  • If using port 465, ensure SMTP_PORT=465 (SSL)`);
  console.error(`  • If using port 587, ensure SMTP_PORT=587 (STARTTLS)`);
  console.error(`  • Check that your SMTP host is correct`);
  process.exit(1);
}

// ── 5. Send test email ─────────────────────────────────────────────────────
console.log(" Step 2/2 — Sending test email...");
try {
  const info = await transporter.sendMail({
    from: `"Emeritus Gadgets" <${user}>`,
    to: sendTo,
    subject: " Emeritus Gadgets — SMTP Test Successful",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="background: #0f172a; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: #fff; margin: 0; font-size: 20px;">Emeritus Gadgets</h1>
          <p style="color: #38bdf8; margin: 8px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">SMTP Test</p>
        </div>
        <h2 style="color: #16a34a; margin-top: 0;"> It works!</h2>
        <p style="color: #475569; line-height: 1.6;">
          Your SMTP configuration is correct. Order confirmation emails
          and admin notifications will be delivered successfully.
        </p>
        <table style="width: 100%; font-size: 13px; color: #64748b; margin-top: 20px; border-collapse: collapse;">
          <tr><td style="padding: 4px 0;">Host</td><td style="text-align: right; font-family: monospace;">${host}</td></tr>
          <tr><td style="padding: 4px 0;">Port</td><td style="text-align: right; font-family: monospace;">${port}</td></tr>
          <tr><td style="padding: 4px 0;">From</td><td style="text-align: right; font-family: monospace;">${user}</td></tr>
          <tr><td style="padding: 4px 0;">Sent at</td><td style="text-align: right;">${new Date().toLocaleString()}</td></tr>
        </table>
      </div>
    `,
  });

  console.log(` Test email sent successfully!\n`);
  console.log(`   Message ID: ${info.messageId}`);
  console.log(`   Sent to:    ${sendTo}`);
  console.log();
  console.log(`📬 Check your inbox (and spam folder) for the test email.`);
  if (adminEmail) {
    console.log(`   (Sent to ADMIN_ORDER_EMAIL: ${adminEmail})`);
  } else {
    console.log(`   (Sent to SMTP_USER since ADMIN_ORDER_EMAIL is not set)`);
  }
} catch (err) {
  console.error(` Failed to send test email:\n`);
  console.error(`   ${err.message}`);
  process.exit(1);
}
