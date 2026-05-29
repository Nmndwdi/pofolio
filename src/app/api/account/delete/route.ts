import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth, signOut } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import { User, Profile, ScanEvent } from "@/lib/db/models";
import { isCloudinaryConfigured } from "@/lib/cloudinary";

/*
 * Delete-account endpoint.
 *
 * Hard delete — User, Profile, ScanEvents, and the user's Cloudinary folder.
 * We keep Cache entries because they're keyed by upstream handle, not userId,
 * and may be used by other accounts.
 *
 * Body shape: { confirmation: "DELETE" } — deliberate friction so a misclick
 * can't nuke an account.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { confirmation?: string } | undefined;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body?.confirmation !== "DELETE") {
    return NextResponse.json(
      { error: "Confirmation required" },
      { status: 400 },
    );
  }

  await connectDB();

  const userId = session.user.id;

  // Order: Profile and events first (they reference User), then Cloudinary,
  // then User. If anything fails, we're left with an orphan that can be
  // cleaned up on retry.
  const profile = await Profile.findOne({ userId });
  if (profile) {
    await ScanEvent.deleteMany({ profileId: profile._id });
    await Profile.deleteOne({ _id: profile._id });
  }

  // Cloudinary cleanup. delete_resources_by_prefix removes everything under
  // pofolio/<userId>/. Best-effort: if it fails, the user's data is still
  // gone from our DB, and the orphaned Cloudinary assets are a billing
  // concern, not a privacy or correctness one.
  if (isCloudinaryConfigured()) {
    const prefix = `pofolio/${userId}`;
    try {
      // Image and raw resources are stored separately on Cloudinary; have to
      // wipe each resource_type bucket explicitly.
      await Promise.all([
        cloudinary.api.delete_resources_by_prefix(prefix, {
          resource_type: "image",
        }),
        cloudinary.api.delete_resources_by_prefix(prefix, {
          resource_type: "raw",
        }),
      ]);
      // After wiping resources, also delete the now-empty folders.
      // Wrapped in try/catch — folder API can throw if folders don't exist
      // (e.g. user never uploaded anything).
      try {
        await cloudinary.api.delete_folder(prefix);
      } catch {
        /* nothing uploaded; folder doesn't exist; fine */
      }
    } catch (err) {
      console.warn(`[delete-account] Cloudinary cleanup failed for ${userId}:`, err);
    }
  }

  await User.deleteOne({ _id: userId });

  // Sign out so the cookie is cleared. `redirect: false` because this is an
  // API route — the client handles navigation.
  await signOut({ redirect: false });

  return NextResponse.json({ ok: true });
}
