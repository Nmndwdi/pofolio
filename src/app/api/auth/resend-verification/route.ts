import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models";
import { generateOpaqueToken } from "@/lib/auth/password";
import { sendEmail, verificationEmailTemplate } from "@/lib/email";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_THROTTLE_MS = 60 * 1000; // 1 minute

const Body = z.object({
  email: z.string().trim().toLowerCase().email(),
});

/*
 * Resend the verification email. Used from the "Check your email" page when
 * the user didn't receive the original (or it expired).
 *
 * Threat model:
 *   - Anyone can hit this endpoint with any email
 *   - We don't reveal whether an account exists (always return 200 with
 *     same message)
 *   - We rate-limit per-account via the verifyEmailLastSentAt field, so
 *     even if an attacker scripts this, the user gets at most one email
 *     per minute (= can't be used to spam someone's inbox)
 *
 * Note: the throttle is per-account, not per-IP. An IP-based throttle
 * adds defense-in-depth but requires a Redis-or-similar store across
 * serverless instances. Per-account is the more important guarantee
 * (it's what protects the recipient).
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  await connectDB();

  const user = await User.findOne({ email: parsed.data.email }).select(
    "+verifyEmailLastSentAt",
  );

  // Always return the same response regardless of whether the user exists,
  // is already verified, or was throttled. The user-facing message is
  // identical; the actual behavior differs internally.
  const genericResponse = NextResponse.json({
    ok: true,
    message:
      "If an unverified account exists with that email, we've sent a new link.",
  });

  if (!user || user.emailVerified) {
    return genericResponse;
  }

  // Throttle: refuse to send if we sent one < RESEND_THROTTLE_MS ago.
  if (
    user.verifyEmailLastSentAt &&
    Date.now() - user.verifyEmailLastSentAt.getTime() < RESEND_THROTTLE_MS
  ) {
    return genericResponse;
  }

  const { token, tokenHash } = generateOpaqueToken();
  user.verifyTokenHash = tokenHash;
  user.verifyTokenExpiresAt = new Date(Date.now() + VERIFY_TTL_MS);
  user.verifyEmailLastSentAt = new Date();
  await user.save();

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://pofoliox.vercel.app/"}/api/auth/verify?token=${token}`;
  const tpl = verificationEmailTemplate(verifyUrl);
  await sendEmail({ to: user.email, ...tpl });

  return genericResponse;
}
