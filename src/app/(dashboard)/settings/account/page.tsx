import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models";
import ChangePasswordForm from "./ChangePasswordForm";

/*
 * Account settings page. Currently only houses change-password.
 *
 * Detect OAuth-only users (no passwordHash) and show a different message —
 * the API would reject their submission anyway with a clear error, but
 * tailoring the page is friendlier than letting them submit a form that
 * can't succeed.
 */
export default async function AccountSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  await connectDB();
  const user = await User.findById(session.user.id)
    .select("+passwordHash email")
    .lean();
  if (!user) redirect("/signin");

  const hasPassword = !!user.passwordHash;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <code>{user.email}</code>
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Change password</h2>
        {hasPassword ? (
          <ChangePasswordForm />
        ) : (
          <p className="rounded-md border bg-muted/50 p-4 text-sm text-muted-foreground">
            You signed up with Google or GitHub, so there&apos;s no password to
            change. To add a password to your account, contact support.
          </p>
        )}
      </section>
    </div>
  );
}
