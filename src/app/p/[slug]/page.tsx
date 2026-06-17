import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connectDB } from "@/lib/db/mongoose";
import { recordView } from "@/lib/analytics";
import { Profile } from "@/lib/db/models";
import { getGitHubData } from "@/lib/integrations/github";
import { getCodeforcesData } from "@/lib/integrations/codeforces";
import { getLeetCodeData } from "@/lib/integrations/leetcode";
import { getDevToData } from "@/lib/integrations/devto";
import { getHuggingFaceData } from "@/lib/integrations/huggingface";
import { resolveLayout } from "@/lib/theme";
import { TerminalTemplate } from "@/templates/terminal";
import { BrutalistTemplate } from "@/templates/brutalist";
import { PressTemplate } from "@/templates/press";
import { BentoTemplate } from "@/templates/bento";
import { SpatialWalkTemplate } from "@/templates/spatial-walk";
import { CinematicTemplate } from "@/templates/cinematic";
import type { LayoutData } from "@/components/layouts/types";

/*
 * Public portfolio page at /p/[slug].
 *
 * Responsibilities:
 *   1. Look up profile, 404 if missing or private
 *   2. Fetch all live integration data in parallel
 *   3. Build a uniform LayoutData envelope
 *   4. Wrap in the user's chosen theme class
 *   5. Dispatch to the layout component the user picked
 *
 * Layouts are dumb renderers — all data fetching happens here.
 */

interface Props {
  // Next 16: `params` and `searchParams` are Promises — awaited where used.
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  await connectDB();
  const profile = await Profile.findOne({ slug, isPublic: true })
    .select("displayName headline bio")
    .lean();
  if (!profile) return { title: "Not found" };
  return {
    title: profile.displayName,
    description:
      profile.headline ?? profile.bio ?? `${profile.displayName}'s portfolio`,
    openGraph: {
      title: profile.displayName,
      description: profile.headline ?? profile.bio ?? undefined,
      type: "profile",
    },
  };
}

export default async function PublicProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  await connectDB();
  const profile = await Profile.findOne({
    slug,
    isPublic: true,
  }).lean();
  if (!profile) notFound();

  // Record the view — fire-and-forget. We deliberately don't await this so it
  // never adds latency to the render; recordView swallows its own errors.
  const fromQR = sp.ref === "qr";
  void recordView(String(profile._id), { fromQR });

  const [github, codeforces, leetcode, devto, huggingface] =
    await Promise.all([
      profile.github ? getGitHubData(profile.github) : Promise.resolve(null),
      profile.codeforces
        ? getCodeforcesData(profile.codeforces)
        : Promise.resolve(null),
      profile.leetcode
        ? getLeetCodeData(profile.leetcode)
        : Promise.resolve(null),
      profile.devto ? getDevToData(profile.devto) : Promise.resolve(null),
      profile.huggingface
        ? getHuggingFaceData(profile.huggingface)
        : Promise.resolve(null),
    ]);

  // Auto-migration: if the user has flat `skills` but no `skillGroups`,
  // expose a synthetic single group named "Skills" to templates. This way
  // every template can render `data.skillGroups` and get something useful
  // without special-casing the empty path. If the user has both, we keep
  // both — templates may choose to merge them or render them separately.
  const flatSkills = profile.skills ?? [];
  const userGroups = profile.skillGroups ?? [];
  const skillGroupsForTemplates =
    userGroups.length > 0
      ? userGroups
      : flatSkills.length > 0
        ? [
            {
              id: "default",
              name: "Skills",
              skills: flatSkills,
            },
          ]
        : [];

  const data: LayoutData = {
    slug: profile.slug,
    displayName: profile.displayName,
    headline: profile.headline ?? undefined,
    bio: profile.bio ?? undefined,
    avatarCloudinaryId: profile.avatarCloudinaryId ?? undefined,
    socials: profile.socials ?? {},
    githubHandle: profile.github ?? undefined,
    leetcodeHandle: profile.leetcode ?? undefined,
    codeforcesHandle: profile.codeforces ?? undefined,
    github,
    codeforces,
    leetcode,
    devto,
    huggingface,
    customLinks: profile.customLinks ?? [],
    customSocials: profile.customSocials ?? [],
    experience: profile.experience ?? [],
    education: profile.education ?? [],
    skills: flatSkills,
    skillGroups: skillGroupsForTemplates,
    resumeCloudinaryId: profile.resumeCloudinaryId ?? undefined,
    files: profile.files ?? [],
    projects: profile.projects ?? [],
  };

  const layout = resolveLayout(profile.layout);

  // No more theme wrapper div — all current templates are self-contained
  // with their own scoped CSS modules. The legacy global `.theme-*`
  // classes (and the --p-* tokens they defined) have been removed.
  return <LayoutRenderer layout={layout} data={data} />;
}

/**
 * Layout dispatch — four self-contained templates. Legacy layout values
 * (`sidebar`, `single`, `multipage`, `grid`) are migrated to `press`
 * server-side in the API normalize step; the resolveLayout helper provides
 * a safety net here that maps any unknown value to `press` as well.
 */
function LayoutRenderer({
  layout,
  data,
}: {
  layout: ReturnType<typeof resolveLayout>;
  data: LayoutData;
}) {
  switch (layout) {
    case "terminal":
      // CLI portfolio — type commands, get output. Scroll mode for read-all.
      return <TerminalTemplate data={data} />;
    case "brutalist":
      // Neo-brutalism — massive type, hazard yellow, hard shadows.
      return <BrutalistTemplate data={data} />;
    case "press":
      // Editorial newspaper — oxblood serifs, asymmetric editorial grid.
      return <PressTemplate data={data} />;
    case "bento":
      // Bento OS — vibrant gradient desktop with draggable frosted tiles.
      return <BentoTemplate data={data} />;
    case "spatial-walk":
      // Spatial-walk — scroll-driven forward walk through a nighttime
      // scene; sections are signposts/stones along a path.
      return <SpatialWalkTemplate data={data} />;
    case "cinematic":
      // Cinematic — scroll-jacked tour with varied transitions (pan-zoom,
      // lateral push, circular reveal, color match-cut, diagonal wipe).
      return <CinematicTemplate data={data} />;
  }
}