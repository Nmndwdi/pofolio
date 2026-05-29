import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models";
import { hashOpaqueToken } from "@/lib/auth/password";

/*
 * Email verification endpoint.
 *
 * GET /api/auth/verify?token=<opaque>
 *
 * The user gets here by clicking the link in their inbox. Because they're
 * coming from an email client, we ALWAYS redirect rather than returning JSON
 * — the user wouldn't see JSON anyway.
 *
 * Three outcomes, three redirect destinations:
 *   - success         → /signin?verified=1
 *   - expired         → /verify-email?error=expired
 *   - invalid/missing → /verify-email?error=invalid
 *
 * Why GET, not POST? Email clients send GET when a user clicks a link.
 * GET is technically supposed to be idempotent and side-effect-free — but
 * for one-shot tokens that delete themselves on use, that's effectively true.
 * This is what every major service does (Stripe, Vercel, GitHub, …).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;

  if (!token) {
    return NextResponse.redirect(`${appUrl}/verify-email?error=invalid`);
  }

  await connectDB();

  const tokenHash = hashOpaqueToken(token);
  // Need to override schema's `select: false` to read verify fields.
  const user = await User.findOne({ verifyTokenHash: tokenHash }).select(
    "+verifyTokenHash +verifyTokenExpiresAt",
  );

  if (!user) {
    return NextResponse.redirect(`${appUrl}/verify-email?error=invalid`);
  }

  if (
    !user.verifyTokenExpiresAt ||
    user.verifyTokenExpiresAt.getTime() < Date.now()
  ) {
    return NextResponse.redirect(`${appUrl}/verify-email?error=expired`);
  }

  // All good. Mark verified, clear the token (single-use).
  user.emailVerified = new Date();
  user.verifyTokenHash = undefined;
  user.verifyTokenExpiresAt = undefined;
  await user.save();

  return NextResponse.redirect(`${appUrl}/signin?verified=1`);
}
