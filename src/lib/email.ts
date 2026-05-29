/*
 * Email module. One place for all outgoing email.
 *
 * Production: uses Resend's HTTP API.
 * Dev (no RESEND_API_KEY): logs the message to the server console with the
 *   action URL highlighted, so you can copy/paste it from your terminal
 *   into a browser. This is intentional — it means you can build and test
 *   the verification/reset flows without touching email at all until you're
 *   ready to deploy.
 *
 * Why HTTP API and not SMTP / Nodemailer:
 *   - Gmail/Hotmail aggressively flag mail from random IPs as spam
 *   - SMTP credentials over a serverless function = Lambda cold start +
 *     TCP handshake + TLS + auth on every send. HTTP POST is one round trip.
 *   - Resend handles SPF/DKIM/DMARC + bounce/complaint feedback for you.
 */

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  // Plain-text alt for clients that block HTML / for accessibility.
  text: string;
}

/*
 * Determine whether we have a real email transport configured.
 * Both env vars must be set; either alone is misconfiguration.
 */
function hasResendConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: EmailParams): Promise<{ ok: boolean; error?: string }> {
  if (!hasResendConfigured()) {
    // Dev fallback. Pretty-print so the URL is easy to spot in `npm run dev` output.
    console.log("\n" + "─".repeat(60));
    console.log(`📧 [email stub] To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Text body:\n${text.split("\n").map((l) => "   " + l).join("\n")}`);
    console.log("─".repeat(60) + "\n");
    return { ok: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to,
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      // Don't bubble Resend errors to the user — they aren't actionable.
      // Log for our own debugging instead.
      console.error("Email send failed:", res.status, body);
      return { ok: false, error: "Email delivery failed" };
    }
    return { ok: true };
  } catch (err) {
    console.error("Email transport error:", err);
    return { ok: false, error: "Email transport error" };
  }
}

/*
 * Email templates. Kept in this file (not as separate .html files) because
 * they're small and inlined-CSS HTML is unreadable as a separate file anyway.
 *
 * Inline styles only — every webmail client (Gmail, Outlook) strips <style>
 * blocks. This is the universal rule of HTML email and the reason it looks
 * like 2003.
 */

export function verificationEmailTemplate(verifyUrl: string) {
  return {
    subject: "Verify your Pofolio email",
    text: `Welcome to Pofolio!

Click this link to verify your email and finish setting up your account:

${verifyUrl}

This link expires in 24 hours. If you didn't sign up for Pofolio, ignore this email.`,
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#f6f7f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #e2e8f0">
    <h1 style="margin:0 0 16px;font-size:20px">Welcome to Pofolio</h1>
    <p style="margin:0 0 24px;color:#475569;line-height:1.5">
      One more step — verify your email so we know it's really you.
    </p>
    <p style="margin:0 0 24px">
      <a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:500">Verify email</a>
    </p>
    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5">
      Or copy this link:<br>
      <span style="word-break:break-all">${verifyUrl}</span>
    </p>
    <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">
      Link expires in 24 hours. Didn't sign up? Ignore this email.
    </p>
  </div>
</body>
</html>`,
  };
}

export function passwordResetEmailTemplate(resetUrl: string) {
  return {
    subject: "Reset your Pofolio password",
    text: `You asked to reset your password.

Click this link to choose a new one:

${resetUrl}

This link expires in 1 hour. If you didn't ask for this, ignore this email — your password won't change.`,
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#f6f7f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #e2e8f0">
    <h1 style="margin:0 0 16px;font-size:20px">Reset your password</h1>
    <p style="margin:0 0 24px;color:#475569;line-height:1.5">
      Click below to choose a new password.
    </p>
    <p style="margin:0 0 24px">
      <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:500">Reset password</a>
    </p>
    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5">
      Or copy this link:<br>
      <span style="word-break:break-all">${resetUrl}</span>
    </p>
    <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">
      Link expires in 1 hour. Didn't request this? Ignore this email.
    </p>
  </div>
</body>
</html>`,
  };
}
