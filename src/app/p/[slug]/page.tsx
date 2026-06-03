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
import { resolveTheme, resolveLayout } from "@/lib/theme";
import { SidebarLayout } from "@/components/layouts/SidebarLayout";
import { SinglePageLayout } from "@/components/layouts/SinglePageLayout";
import { TerminalTemplate } from "@/templates/terminal";
import { BrutalistTemplate } from "@/templates/brutalist";
import { PressTemplate } from "@/templates/press";
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
  const theme = resolveTheme(profile.theme);

  return (
    <div className={`theme-${theme}`}>
      <LayoutRenderer layout={layout} data={data} />
    </div>
  );
}

/**
 * Layout dispatch. New layouts: add an import + a case here.
 *
 * Until "multipage" and "grid" are built, they fall back to sidebar so the
 * page still renders. Picking them in the editor still works — the layout
 * just looks like sidebar until those components ship.
 */
function LayoutRenderer({
  layout,
  data,
}: {
  layout: ReturnType<typeof resolveLayout>;
  data: LayoutData;
}) {
  switch (layout) {
    case "sidebar":
      return <SidebarLayout data={data} />;
    case "single":
      return <SinglePageLayout data={data} />;
    case "terminal":
      // Self-contained template — its own CSS module, own scope. The wrapper
      // <div className={`theme-${theme}`}> above doesn't affect it.
      return <TerminalTemplate data={data} />;
    case "brutalist":
      // Self-contained — neo-brutalism, scoped CSS, own design system.
      return <BrutalistTemplate data={data} />;
    case "press":
      // Self-contained — editorial newspaper, oxblood-on-cream, kinetic
      // typography, scoped CSS. No CLI, no widgets — just typography.
      return <PressTemplate data={data} />;
    case "multipage":
    case "grid":
      return <SidebarLayout data={data} />;
  }
}