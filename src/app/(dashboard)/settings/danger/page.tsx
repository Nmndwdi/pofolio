import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DeleteAccountForm from "./DeleteAccountForm";

export default async function DangerSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Danger zone</h1>
        <p className="text-sm text-muted-foreground">
          Actions here are permanent. Read carefully.
        </p>
      </div>

      <section className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-5">
        <h2 className="text-base font-semibold">Delete your account</h2>
        <p className="text-sm text-muted-foreground">
          This deletes your profile, all uploaded files, and your account.
          Your public URL will become available for someone else to claim.
          This cannot be undone.
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
