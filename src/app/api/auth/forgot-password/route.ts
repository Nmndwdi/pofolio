import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models";
import { generateOpaqueToken } from "@/lib/auth/password";
import { ForgotPasswordSchema } from "@/lib/validators/auth";
import { sendEmail, passwordResetEmailTemplate } from "@/lib/email";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/*
 * Forgot-password endpoint.
 *
 * Always returns 200 with a generic message — we don't reveal whether an
 * account exists. The page-level UI hints "didn't get one? maybe sign up?"
 * to handle the no-account case gracefully without confirming it.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ForgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email } = parsed.data;

  await connectDB();

  const user = await User.findOne({ email });
  if (user) {
    const { token, tokenHash } = generateOpaqueToken();
    user.set({
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    });
    await user.save();

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password/${token}`;
    const tpl = passwordResetEmailTemplate(resetUrl);
    await sendEmail({ to: email, ...tpl });
  }

  return NextResponse.json({
    ok: true,
    message:
      "If an account exists with that email, a reset link has been sent.",
  });
}
