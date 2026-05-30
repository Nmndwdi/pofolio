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
        customLinks: profile.customLinks ?? [],
        experience: profile.experience ?? [],
        education: profile.education ?? [],
        skills: profile.skills ?? [],
        resumeCloudinaryId: profile.resumeCloudinaryId ?? "",
        files: profile.files ?? [],
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
        theme: profile.theme,
        layout: profile.layout,
      }}
    />
  );
}