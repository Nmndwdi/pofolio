import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Profile } from "@/lib/db/models";
import { slugSchema } from "@/lib/validators/profile";
import { isReservedSlug } from "@/lib/validators/reserved-slugs";
import { auth } from "@/lib/auth";

/*
 * GET /api/profile/slug-available?slug=foo
 *
 * Returns one of:
 *   { status: "ok" }              — available, can be claimed
 *   { status: "yours" }           — this is your current slug; allowed to keep
 *   { status: "invalid", reason } — fails format check (length, chars)
 *   { status: "reserved" }        — on the blocklist (admin, api, …)
 *   { status: "taken" }           — someone else has it
 *
 * Designed to be hit on every keystroke (debounced client-side). The Profile
 * lookup is a single indexed find by slug — fast even with millions of users.
 *
 * Auth note: this is callable while logged out (so the signup form can use it)
 * AND while logged in (so the slug-rename UI in settings can use it). When
 * logged in we report "yours" for their own slug rather than "taken".
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("slug") ?? "";

  // Validate format first — cheap, no DB hit needed for invalid input.
  const parsed = slugSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({
      status: "invalid",
      reason: parsed.error.issues[0]?.message ?? "Invalid slug",
    });
  }

  const slug = parsed.data;

  if (isReservedSlug(slug)) {
    return NextResponse.json({ status: "reserved" });
  }

  await connectDB();

  // Get the current session (if any) WITHOUT requiring auth — auth() returns
  // null for logged-out users, which is fine.
  const session = await auth();

  const existing = await Profile.findOne({ slug }).select("userId").lean();

  if (!existing) {
    return NextResponse.json({ status: "ok" });
  }

  // Slug exists — but if it belongs to the requesting user, that's "yours".
  if (
    session?.user?.id &&
    String(existing.userId) === session.user.id
  ) {
    return NextResponse.json({ status: "yours" });
  }

  return NextResponse.json({ status: "taken" });
}
