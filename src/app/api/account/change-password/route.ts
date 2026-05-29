import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { ChangePasswordSchema } from "@/lib/validators/auth";

/*
 * Change-password endpoint.
 * Requires session + correct current password (defense-in-depth in case a
 * session cookie is somehow stolen).
 *
 * Note: users who signed up via OAuth-only have no passwordHash. They get a
 * 400 here with a clear message. v2 could let them set an initial password,
 * but that's a security nit (allows OAuth-account-takeover via stolen cookie)
 * — defer until needed.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ChangePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  await connectDB();

  const user = await User.findById(session.user.id).select("+passwordHash");
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.passwordHash) {
    return NextResponse.json(
      {
        error:
          "This account uses OAuth sign-in and has no password set. Contact support to add one.",
      },
      { status: 400 },
    );
  }

  const ok = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 },
    );
  }

  user.passwordHash = await hashPassword(parsed.data.newPassword);
  await user.save();

  return NextResponse.json({ ok: true });
}
