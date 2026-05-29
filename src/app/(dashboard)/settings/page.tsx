import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import { Profile } from "@/lib/db/models";
import SlugForm from "./SlugForm";

export default async function ProfileSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  await connectDB();
  const profile = await Profile.findOne({ userId: session.user.id })
    .select("slug")
    .lean();
  if (!profile) redirect("/dashboard");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your public URL. Changing it breaks any old QR codes or links — pick
          carefully.
        </p>
      </div>
      <SlugForm currentSlug={profile.slug} />
    </div>
  );
}
