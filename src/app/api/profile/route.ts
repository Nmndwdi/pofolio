import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import { Profile } from "@/lib/db/models";
import { ProfileFormSchema } from "@/lib/validators/profile-form";

/*
 * /api/profile — the editor's read/write endpoint.
 *
 * Both methods require auth and operate on the *current user's* profile.
 */

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const profile = await Profile.findOne({ userId: session.user.id }).lean();
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    slug: profile.slug,
    displayName: profile.displayName ?? "",
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    avatarCloudinaryId: profile.avatarCloudinaryId ?? "",
    socials: profile.socials ?? {},
    github: profile.github ?? "",
    leetcode: profile.leetcode ?? "",
    codeforces: profile.codeforces ?? "",
    devto: profile.devto ?? "",
    huggingface: profile.huggingface ?? "",
    customLinks: profile.customLinks ?? [],
    customSocials: profile.customSocials ?? [],
    experience: profile.experience ?? [],
    education: profile.education ?? [],
    skills: profile.skills ?? [],
    skillGroups: profile.skillGroups ?? [],
    resumeCloudinaryId: profile.resumeCloudinaryId ?? "",
    files: profile.files ?? [],
    projects: profile.projects ?? [],
    theme: profile.theme ?? "mono",
    layout: profile.layout ?? "sidebar",
  });
}

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

  const parsed = ProfileFormSchema.safeParse(body);
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

  const data = parsed.data;
  const cleanedLinks = data.customLinks.filter(
    (l) => l.label.trim() !== "" && l.url.trim() !== "",
  );
  // customSocials: same drop-empty-placeholders pattern as customLinks.
  const cleanedSocialLinks = data.customSocials.filter(
    (s) => s.label.trim() !== "" && s.url.trim() !== "",
  );
  // Experience: drop placeholders; normalize per-exp skills (trim/dedupe/drop
  // empties) so the DB stays clean.
  const cleanedExperience = data.experience
    .filter((e) => e.company.trim() !== "" || e.role.trim() !== "")
    .map((e) => ({
      ...e,
      skills: [
        ...new Set((e.skills ?? []).map((s) => s.trim()).filter(Boolean)),
      ],
    }));
  const cleanedEducation = data.education.filter(
    (e) => e.institution.trim() !== "" || e.degree.trim() !== "",
  );
  const cleanedSkills = [
    ...new Set(data.skills.map((s) => s.trim()).filter((s) => s !== "")),
  ];
  // skillGroups: drop empty placeholder groups (no name AND no skills);
  // normalize each group's skill list.
  const cleanedSkillGroups = data.skillGroups
    .filter(
      (g) =>
        g.name.trim() !== "" ||
        (g.skills ?? []).some((s) => s.trim() !== ""),
    )
    .map((g) => ({
      ...g,
      skills: [
        ...new Set((g.skills ?? []).map((s) => s.trim()).filter(Boolean)),
      ],
    }));

  // Drop empty project placeholders — same pattern as customLinks/experience.
  // A project is "real" if it has a title; otherwise it's a row the user
  // added via "+ Add project" but didn't fill.
  // Also: normalize tech array (trim + dedupe + drop empties).
  const cleanedProjectsRaw = data.projects
    .filter((p) => p.title.trim() !== "")
    .map((p) => ({
      ...p,
      tech: [...new Set((p.tech ?? []).map((t) => t.trim()).filter(Boolean))],
    }));
  // Enforce single-featured invariant: only the FIRST featured project wins,
  // all subsequent featured flags are dropped. The editor already enforces
  // this on toggle, but server-side enforcement protects against legacy
  // data with multiple featureds and direct API hits.
  let featuredSeen = false;
  const cleanedProjects = cleanedProjectsRaw.map((p) => {
    if (p.featured && !featuredSeen) {
      featuredSeen = true;
      return p;
    }
    return { ...p, featured: false };
  });

  const cleanedSocials: typeof data.socials = {};
  for (const [k, v] of Object.entries(data.socials)) {
    if (typeof v === "string" && v.trim() !== "") {
      (cleanedSocials as Record<string, string>)[k] = v.trim();
    }
  }
  const normalized = {
    displayName: data.displayName,
    headline: data.headline || undefined,
    bio: data.bio || undefined,
    avatarCloudinaryId: data.avatarCloudinaryId || undefined,
    socials: cleanedSocials,
    github: data.github || undefined,
    leetcode: data.leetcode || undefined,
    codeforces: data.codeforces || undefined,
    devto: data.devto || undefined,
    huggingface: data.huggingface || undefined,
    customLinks: cleanedLinks,
    customSocials: cleanedSocialLinks,
    experience: cleanedExperience,
    education: cleanedEducation,
    skills: cleanedSkills,
    skillGroups: cleanedSkillGroups,
    resumeCloudinaryId: data.resumeCloudinaryId || undefined,
    files: data.files,
    projects: cleanedProjects,
    theme: data.theme,
    layout: data.layout,
  };

  const updated = await Profile.findOneAndUpdate(
    { userId: session.user.id },
    {
      $set: normalized,
      // Drop the legacy `projectImages` field if it still exists on a doc —
      // pre-v1 we may have rows from before the schema change.
      $unset: { projectImages: "" },
    },
    { new: true },
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}