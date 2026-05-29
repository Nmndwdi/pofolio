import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models";
import { hashPassword, hashResetToken } from "@/lib/auth/password";
import { ResetPasswordSchema } from "@/lib/validators/auth";

/*
 * Reset-password endpoint.
 *
 * Looks up the user whose stored resetTokenHash matches sha256(submitted token).
 * Validates expiry. Sets new password. Clears the reset token (single-use).
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ResetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { token, password } = parsed.data;
  const tokenHash = hashResetToken(token);

  await connectDB();

  // Need to override the schema's `select: false` to read the reset fields.
  const user = await User.findOne({ resetTokenHash: tokenHash }).select(
    "+passwordHash +resetTokenHash +resetTokenExpiresAt",
  );

  // Combined check on existence + expiry, with a generic error to avoid
  // distinguishing "wrong token" from "expired token".
  if (
    !user ||
    !user.resetTokenExpiresAt ||
    user.resetTokenExpiresAt.getTime() < Date.now()
  ) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 },
    );
  }

  user.passwordHash = await hashPassword(password);
  user.resetTokenHash = undefined;
  user.resetTokenExpiresAt = undefined;
  await user.save();

  return NextResponse.json({ ok: true });
}
