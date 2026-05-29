import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models";

/*
 * Tiny helper endpoint. Used ONLY when the sign-in form receives a generic
 * sign-in error from NextAuth and needs to decide what to do next:
 *
 *   - Tell the user "wrong email or password"      (default)
 *   - Redirect them to /verify-email               (account exists but unverified)
 *
 * This is a deliberate, narrow leak of information ("an account with this
 * email exists but isn't verified"). The alternative — making everyone
 * stare at "invalid credentials" forever — is worse UX. Real attackers
 * already learn account existence from sign-up ("email taken").
 *
 * To minimize the leak we ONLY answer "unverified" when the password is
 * also correct. So a random attacker probing emails learns nothing —
 * unverified-but-wrong-password still returns "invalid".
 */

const Body = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "invalid" });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" });
  }

  // Lazy-load bcrypt only here; keeps the rest of the route lightweight.
  const { verifyPassword } = await import("@/lib/auth/password");

  await connectDB();

  const user = await User.findOne({ email: parsed.data.email }).select(
    "+passwordHash",
  );
  if (!user || !user.passwordHash) {
    return NextResponse.json({ status: "invalid" });
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ status: "invalid" });
  }

  // Right password, but unverified → that's the case we wanted to detect.
  if (!user.emailVerified) {
    return NextResponse.json({ status: "unverified" });
  }

  // Right password and verified — sign-in should have succeeded. This case
  // is unreachable in practice, but covered for completeness.
  return NextResponse.json({ status: "ok" });
}
