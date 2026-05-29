import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { User, Profile } from "@/lib/db/models";
import { hashPassword, generateOpaqueToken } from "@/lib/auth/password";
import { SignUpSchema } from "@/lib/validators/auth";
import { isReservedSlug } from "@/lib/validators/reserved-slugs";
import { sendEmail, verificationEmailTemplate } from "@/lib/email";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/*
 * Sign-up endpoint.
 *
 * The user picks their own slug at signup (with live availability checking
 * client-side). We re-validate here:
 *   1. Format (Zod, already done by SignUpSchema)
 *   2. Reserved list
 *   3. Not taken (race-safe via the unique index on Profile.slug)
 *
 * Then create User + Profile and send verification email.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SignUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { name, email, password, slug } = parsed.data;

  // Block reserved slugs
  if (isReservedSlug(slug)) {
    return NextResponse.json(
      {
        error: "That slug is reserved",
        fieldErrors: { slug: ["That slug is reserved"] },
      },
      { status: 400 },
    );
  }

  await connectDB();

  // Pre-flight checks (race conditions caught later by unique indexes)
  if (await User.exists({ email })) {
    return NextResponse.json(
      { error: "An account with that email already exists" },
      { status: 409 },
    );
  }
  if (await Profile.exists({ slug })) {
    return NextResponse.json(
      {
        error: "That slug is taken",
        fieldErrors: { slug: ["Already taken — try another"] },
      },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const { token, tokenHash } = generateOpaqueToken();
  const verifyTokenExpiresAt = new Date(Date.now() + VERIFY_TTL_MS);

  let user;
  try {
    user = await User.create({
      email,
      name,
      passwordHash,
      verifyTokenHash: tokenHash,
      verifyTokenExpiresAt,
      verifyEmailLastSentAt: new Date(),
    });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      return NextResponse.json(
        { error: "An account with that email already exists" },
        { status: 409 },
      );
    }
    throw err;
  }

  try {
    await Profile.create({
      userId: user._id,
      slug,
      displayName: name,
      theme: "minimal",
      sections: [],
    });
  } catch (err: unknown) {
    // Slug race: someone else grabbed it after our pre-flight check.
    // Roll back the user and return a slug-specific error so the form can
    // re-focus the slug field.
    await User.deleteOne({ _id: user._id });
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      return NextResponse.json(
        {
          error: "That slug was just taken",
          fieldErrors: { slug: ["Just taken by someone else — try another"] },
        },
        { status: 409 },
      );
    }
    throw err;
  }

  // Send verification email — failure here doesn't fail the signup.
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/verify?token=${token}`;
  const tpl = verificationEmailTemplate(verifyUrl);
  await sendEmail({ to: email, ...tpl });

  return NextResponse.json(
    { ok: true, needsVerification: true, email, slug },
    { status: 201 },
  );
}
