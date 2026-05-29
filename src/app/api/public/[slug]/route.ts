import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Profile } from "@/lib/db/models";
import { deriveUrl } from "@/lib/cloudinary";

/*
 * GET /api/public/[slug]
 *
 * Returns the minimal subset of profile data needed by the OG image
 * generator (which runs on Edge and can't access Mongoose directly).
 * Public — no auth required, no sensitive fields included.
 *
 * Could also be useful as a public read API later (e.g. for embedding
 * portfolio data on third-party sites). Keep the response shape narrow
 * for now to avoid committing to a public schema we'd have to maintain.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  // Next 16: route-handler `params` is a Promise — must be awaited.
  const { slug } = await params;
  await connectDB();
  const profile = await Profile.findOne({
    slug,
    isPublic: true,
  })
    .select("displayName headline avatarCloudinaryId")
    .lean();

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    displayName: profile.displayName,
    headline: profile.headline ?? null,
    avatarUrl: profile.avatarCloudinaryId
      ? deriveUrl(profile.avatarCloudinaryId, {
          width: 200,
          height: 200,
          crop: "fill",
        })
      : null,
  });
}
