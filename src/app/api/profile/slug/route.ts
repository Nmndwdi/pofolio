import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import { Profile } from "@/lib/db/models";
import { SlugChangeSchema } from "@/lib/validators/profile-form";
import { isReservedSlug } from "@/lib/validators/reserved-slugs";

/*
 * PATCH /api/profile/slug
 *
 * Separate from the main /api/profile PATCH because slug changes have
 * different semantics:
 *   - Breaks any old QR codes / saved links pointing at the previous slug
 *   - Has uniqueness constraints to enforce
 *   - In future versions we may add a cooldown (e.g. 30 days between renames)
 *     or keep old slugs as redirect aliases
 *
 * For v1: any authenticated user can rename to any available slug, no cooldown.
 */
export async function PATCH(req: Request) {
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

  const parsed = SlugChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid slug",
      },
      { status: 400 },
    );
  }

  const newSlug = parsed.data.slug;

  if (isReservedSlug(newSlug)) {
    return NextResponse.json(
      { error: "This slug is reserved" },
      { status: 400 },
    );
  }

  await connectDB();

  // Same-slug no-op: if the user "renames" to their current slug, return success
  // without an update. Saves a write and avoids a confusing dupe-key error.
  const current = await Profile.findOne({ userId: session.user.id })
    .select("slug")
    .lean();
  if (!current) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  if (current.slug === newSlug) {
    return NextResponse.json({ ok: true, slug: newSlug });
  }

  // Race-safe: rely on the unique index. If someone else grabs the slug
  // between our check and our write, the update throws a duplicate-key error.
  try {
    await Profile.updateOne(
      { userId: session.user.id },
      { $set: { slug: newSlug } },
    );
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      return NextResponse.json(
        { error: "That slug is taken" },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true, slug: newSlug });
}
