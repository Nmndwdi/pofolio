import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

/*
 * Server-component layout. Auth check happens here (in addition to the proxy)
 * because the proxy uses Edge runtime and may have minor timing edge cases —
 * the server-component check is the source of truth.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/dashboard" className="font-bold tracking-tight">
            Pofolio
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/editor" className="hover:underline">
              Editor
            </Link>
            <Link href="/settings" className="hover:underline">
              Settings
            </Link>
            <span className="text-muted-foreground">{session.user.email}</span>
            {/*
             * Server Action for sign-out. Cleaner than an API route + fetch:
             * the form posts directly, NextAuth clears the cookie, redirects
             * back. No client JS needed for the auth state to change.
             */}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="container flex-1 py-8">{children}</main>
    </div>
  );
}
