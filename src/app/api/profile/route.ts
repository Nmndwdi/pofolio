import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import { Profile } from "@/lib/db/models";
import { ProfileFormSchema } from "@/lib/validators/profile-form";

/*
 * /api/profile — the editor's read/write endpoint.
 *
 * Both methods require auth and operate on the *current user's* profile.
 * No userId or slug in the URL — we resolve from the session. This means
 * the route is small and cannot be tricked into editing someone else's
 * profile by URL manipulation.
 *
 * Shape: the request/response is the FORM shape (ProfileFormInput), not the
 * raw Profile document. The user fills a form; we store as-is. In step 2 we
 * may translate parts of this into a sections[] array, but for now the form
 * fields map 1:1 to top-level Profile fields. Coding handles + custom links
 * are kept on the Profile document directly (added in this step, see below).
 */

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const profile = await Profile.findOne({ userId: session.user.id }).lean();
  if (!profile) {
    // This shouldn't happen — every user has a profile created at signup.
    // If it does, it's a data integrity issue worth surfacing rather than
    // silently auto-creating.
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Project to form shape. Empty strings (not undefined) so form inputs render
  // as controlled with empty value rather than "uncontrolled-then-controlled"
  // React warnings.
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
    experience: profile.experience ?? [],
    education: profile.education ?? [],
    skills: profile.skills ?? [],
    resumeCloudinaryId: profile.resumeCloudinaryId ?? "",
    files: profile.files ?? [],
    projectImages: profile.projectImages ?? [],
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

  // Normalize empty strings → unset, so we don't store "headline: ''" in Mongo.
  // Drop empty customLinks rows (placeholder rows from the editor's "+ Add link"
  // that the user added but didn't fill in).
  const data = parsed.data;
  const cleanedLinks = data.customLinks.filter(
    (l) => l.label.trim() !== "" && l.url.trim() !== "",
  );
  // Drop experience rows that have no company AND no role — placeholder rows.
  const cleanedExperience = data.experience.filter(
    (e) => e.company.trim() !== "" || e.role.trim() !== "",
  );
  // Drop education rows with no institution AND no degree.
  const cleanedEducation = data.education.filter(
    (e) => e.institution.trim() !== "" || e.degree.trim() !== "",
  );
  // Drop blank skills, dedupe.
  const cleanedSkills = [
    ...new Set(data.skills.map((s) => s.trim()).filter((s) => s !== "")),
  ];
  // Coerce empty social strings to undefined so they don't pollute the DB.
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
    experience: cleanedExperience,
    education: cleanedEducation,
    skills: cleanedSkills,
    resumeCloudinaryId: data.resumeCloudinaryId || undefined,
    files: data.files,
    projectImages: data.projectImages,
    theme: data.theme,
    layout: data.layout,
  };

  // findOneAndUpdate so we get the post-update doc back in one round trip.
  const updated = await Profile.findOneAndUpdate(
    { userId: session.user.id },
    { $set: normalized },
    { new: true },
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
