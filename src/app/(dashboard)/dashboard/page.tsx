import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import { Profile } from "@/lib/db/models";
import { getViewStats } from "@/lib/analytics";
import Link from "next/link";
import CopyUrlButton from "./CopyUrlButton";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null; // layout already redirects

  await connectDB();
  const profile = await Profile.findOne({ userId: session.user.id })
    .select("slug displayName headline bio github leetcode codeforces customLinks")
    .lean();

  if (!profile) {
    // Defensive — shouldn't happen since signup creates a profile.
    return (
      <div className="text-sm text-muted-foreground">
        No profile found.{" "}
        <Link href="/signin" className="underline">
          Sign in again
        </Link>
        .
      </div>
    );
  }

  const publicPath = `/p/${profile.slug}`;
  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}${publicPath}`;

  // View stats for the analytics card.
  const viewStats = await getViewStats(String(profile._id));

  // A naive "completeness" check to nudge users to fill out their portfolio.
  const completeness = computeCompleteness(profile);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Hey, {profile.displayName.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          Your portfolio lives at one URL — share it anywhere.
        </p>
      </div>

      {/* The URL is the centerpiece. Big, copyable, with a direct link. */}
      <div className="rounded-lg border bg-card p-6">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Your public URL
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link
            href={publicPath}
            target="_blank"
            className="break-all text-lg font-mono font-medium hover:underline"
          >
            {publicUrl}
          </Link>
          <CopyUrlButton url={publicUrl} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/editor" className="btn-primary">
            Edit your portfolio
          </Link>
          <Link href={publicPath} target="_blank" className="btn-secondary">
            View as public
          </Link>
        </div>
      </div>

      {/* Views — owner-only analytics. */}
      <div className="rounded-lg border bg-card p-6">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Page views
        </div>
        <div className="mt-2 flex items-end gap-8">
          <div>
            <div className="text-3xl font-bold tracking-tight">
              {viewStats.total.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">all time</div>
          </div>
          <div>
            <div className="text-3xl font-bold tracking-tight">
              {viewStats.last7Days.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">last 7 days</div>
          </div>
        </div>
        {viewStats.total === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            No views yet. Share your URL to start tracking. Unique visitors are
            counted once per day; bots are excluded.
          </p>
        )}
      </div>

      {/* Social preview — what people see when your URL is shared. */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Social preview
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              This is the card that appears when your URL is shared on
              Twitter, LinkedIn, Slack, etc.
            </p>
          </div>
          <a
            href={`${publicUrl}/opengraph-image`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Open full image ↗
          </a>
        </div>
        <div className="mt-4 overflow-hidden rounded-md border">
          {/* The OG image is regenerated on every public page load — append a
              cache-busting query so the dashboard preview stays fresh after
              edits. eslint-disable for next/image: this is a dynamic SVG-ish
              endpoint, not a static asset; <img> is intentional. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${publicUrl}/opengraph-image?v=${profile.updatedAt ? new Date(profile.updatedAt).getTime() : Date.now()}`}
            alt="Social-share preview for your portfolio"
            className="block w-full"
          />
        </div>
      </div>

      {/* Completeness nudge */}
      {completeness.percent < 100 && (
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Your portfolio is {completeness.percent}% set up</h2>
            <Link href="/editor" className="text-sm font-medium text-primary hover:underline">
              Continue →
            </Link>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${completeness.percent}%` }}
            />
          </div>
          {completeness.missing.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
              {completeness.missing.map((m) => (
                <li key={m}>• {m}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/*
 * "Completeness" is a soft metric to nudge new users — not a gate.
 * Each field present adds 20%. Six fields total = 100%.
 * Tweak the weights if a field feels under/over-valued.
 */
function computeCompleteness(p: {
  displayName?: string;
  headline?: string;
  bio?: string;
  github?: string;
  leetcode?: string | null;
  codeforces?: string | null;
  customLinks?: Array<unknown>;
}) {
  const checks: Array<{ ok: boolean; missing: string }> = [
    { ok: !!p.headline, missing: "Add a one-line headline" },
    { ok: !!p.bio, missing: "Write a short bio" },
    { ok: !!p.github, missing: "Add your GitHub username" },
    {
      ok: !!(p.leetcode || p.codeforces),
      missing: "Add a LeetCode or Codeforces handle",
    },
    {
      ok: (p.customLinks?.length ?? 0) > 0,
      missing: "Add at least one link (project, blog, …)",
    },
  ];
  const done = checks.filter((c) => c.ok).length;
  const percent = Math.round((done / checks.length) * 100);
  return { percent, missing: checks.filter((c) => !c.ok).map((c) => c.missing) };
}
