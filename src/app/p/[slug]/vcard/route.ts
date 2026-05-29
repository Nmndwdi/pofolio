import { connectDB } from "@/lib/db/mongoose";
import { Profile } from "@/lib/db/models";
import { buildVCard } from "@/lib/vcard";

/*
 * GET /p/[slug]/vcard — download a .vcf contact card for a public profile.
 *
 * Public (no auth) — same visibility as the portfolio page itself. Respects
 * the profile's isPublic flag: a private profile returns 404 here too.
 */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  await connectDB();

  const profile = await Profile.findOne({ slug, isPublic: true })
    .select("displayName headline socials slug")
    .lean();

  if (!profile) {
    return new Response("Not found", { status: 404 });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const vcard = buildVCard({
    displayName: profile.displayName,
    headline: profile.headline,
    email: profile.socials?.email,
    website: profile.socials?.website,
    portfolioUrl: `${base}/p/${profile.slug}`,
  });

  // Slugify the filename from the display name.
  const filename = `${profile.slug}.vcf`;

  return new Response(vcard, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Cache briefly — contact details change rarely.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
