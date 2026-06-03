import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import { Profile } from "@/lib/db/models";
import EditorForm from "./EditorForm";

/*
 * Editor page — server-loads the user's current profile and hands it to the
 * client form as initial values. Avoids a client fetch + loading state.
 */
export default async function EditorPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  await connectDB();
  const profile = await Profile.findOne({ userId: session.user.id }).lean();
  if (!profile) redirect("/dashboard");

  return (
    <EditorForm
      initial={{
        slug: profile.slug,
        displayName: profile.displayName ?? "",
        headline: profile.headline ?? "",
        bio: profile.bio ?? "",
        avatarCloudinaryId: profile.avatarCloudinaryId ?? "",
        socials: {
          github: profile.socials?.github ?? "",
          linkedin: profile.socials?.linkedin ?? "",
          twitter: profile.socials?.twitter ?? "",
          website: profile.socials?.website ?? "",
          email: profile.socials?.email ?? "",
        },
        github: profile.github ?? "",
        leetcode: profile.leetcode ?? "",
        codeforces: profile.codeforces ?? "",
        devto: profile.devto ?? "",
        huggingface: profile.huggingface ?? "",
        customLinks: (profile.customLinks ?? []).map((l) => ({
          id: l.id,
          label: l.label,
          url: l.url,
          // Description was added later — old docs may lack it.
          description: l.description ?? "",
        })),
        customSocials: profile.customSocials ?? [],
        experience: (profile.experience ?? []).map((e) => ({
          id: e.id,
          company: e.company,
          role: e.role,
          dates: e.dates,
          summary: e.summary,
          // Per-experience skills added later — old docs may lack it.
          skills: e.skills ?? [],
        })),
        education: (profile.education ?? []).map((e) => ({
          id: e.id,
          institution: e.institution,
          degree: e.degree,
          dates: e.dates,
          description: e.description ?? "",
        })),
        skills: profile.skills ?? [],
        skillGroups: (profile.skillGroups ?? []).map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description ?? "",
          skills: g.skills ?? [],
        })),
        resumeCloudinaryId: profile.resumeCloudinaryId ?? "",
        files: (profile.files ?? []).map((f) => ({
          id: f.id,
          label: f.label,
          publicId: f.publicId,
          resourceType: f.resourceType,
          format: f.format,
          bytes: f.bytes,
          description: f.description ?? "",
        })),
        // Projects replaces the legacy projectImages flat gallery.
        // Normalize optional fields from Mongo (which come back as undefined)
        // to the concrete shape react-hook-form's defaultValues expects.
        projects: (profile.projects ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description ?? "",
          role: p.role ?? "",
          year: p.year ?? "",
          demoUrl: p.demoUrl ?? "",
          sourceUrl: p.sourceUrl ?? "",
          videoUrl: p.videoUrl ?? "",
          tech: p.tech ?? [],
          images: p.images ?? [],
          featured: p.featured ?? false,
        })),
        // Legacy theme values (e.g. "minimal" from earlier builds) aren't in
        // the current zod enum and would block form submission. Coerce
        // anything unrecognised to "mono". The theme picker UI is hidden for
        // now — this is just to ensure the underlying field has a valid value.
        theme:
          profile.theme === "mono" ||
          profile.theme === "paper" ||
          profile.theme === "terminal" ||
          profile.theme === "glass"
            ? profile.theme
            : "mono",
        layout: profile.layout,
      }}
    />
  );
}