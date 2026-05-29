import Link from "next/link";
import type { CodeforcesData } from "@/lib/integrations/codeforces";
import { CodeforcesRatingChartLazy } from "./CodeforcesRatingChartLazy";
import { CodeforcesHeatmap } from "./CodeforcesHeatmap";

/*
 * Codeforces section renderer.
 *
 * Hero: current rating + rank, in the official rank color.
 * Below: contests participated count, max rating.
 * Then: up to 5 recent contests with rating delta.
 *
 * If user is unrated (never participated), we show a simpler "Joined X" view.
 */

export function CodeforcesSection({ data }: { data: CodeforcesData }) {
  const { user, recentContests, contestsParticipated } = data;
  const profileUrl = `https://codeforces.com/profile/${user.handle}`;
  const isUnrated = user.rating == null;

  return (
    <section className="space-y-6">
      {/* Hero: giant rating number + handle/rank to the side */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        {!isUnrated && user.rating != null && (
          <div
            className="font-p-display text-7xl leading-none tracking-tight sm:text-8xl"
            style={{ color: rankColor(user.rank) }}
          >
            {user.rating}
          </div>
        )}
        <div className="space-y-1 pb-1">
          <Link
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm font-medium hover:underline"
          >
            @{user.handle}
          </Link>
          {user.rank && (
            <div
              className="font-p-display text-lg italic"
              style={{ color: rankColor(user.rank) }}
            >
              {capitalize(user.rank)}
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-p-fg-muted">
            {user.maxRating != null && user.maxRating !== user.rating && (
              <span>
                max <span className="text-p-fg">{user.maxRating}</span>
              </span>
            )}
            <span>
              <span className="text-p-fg">{contestsParticipated}</span>{" "}
              contests
            </span>
          </div>
        </div>
      </div>

      {/* Rating-history chart — only meaningful with 2+ rated contests. */}
      {/* Submission activity heatmap — derived from recent submissions.
          Defensive `?? []`: cached Codeforces data written before this field
          was added has no `submissionHeatmap`, so reading `.length` directly
          would crash. */}
      {(data.submissionHeatmap ?? []).length > 0 && (
        <CodeforcesHeatmap data={data.submissionHeatmap ?? []} />
      )}

      {/* Rating-history chart — only meaningful with 2+ rated contests. */}
      {data.ratingHistory.length >= 2 && (
        <CodeforcesRatingChartLazy data={data.ratingHistory} />
      )}

      {recentContests.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-p-display text-base italic text-p-fg-muted">
            Recent contests
          </h3>
          <ul className="space-y-1.5">
            {recentContests.map((c) => {
              const delta = c.newRating - c.oldRating;
              const positive = delta >= 0;
              return (
                <li key={c.contestId}>
                  <Link
                    href={`https://codeforces.com/contest/${c.contestId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-md border border-p-border bg-p-surface px-3 py-2 text-sm transition-colors hover:bg-p-surface-2"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {c.contestName}
                    </span>
                    <span className="shrink-0 text-xs text-p-fg-muted">
                      rank {c.rank}
                    </span>
                    <span
                      className={
                        "shrink-0 font-mono text-xs " +
                        (positive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive")
                      }
                    >
                      {positive ? "+" : ""}
                      {delta}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/**
 * Codeforces rank colors. Mirrors the official Codeforces palette so users
 * see the same color they're used to seeing on the platform.
 *
 * Rank values from the API are lowercase strings; we match case-insensitive.
 */
function rankColor(rank: string | null | undefined): string {
  if (!rank) return "var(--foreground)";
  const r = rank.toLowerCase();
  if (r.includes("legendary grandmaster")) return "#ff0000"; // red, special handle styling on CF
  if (r.includes("international grandmaster")) return "#ff0000";
  if (r.includes("grandmaster")) return "#ff0000";
  if (r.includes("international master")) return "#ff8c00";
  if (r.includes("master")) return "#ff8c00";
  if (r.includes("candidate master")) return "#aa00aa";
  if (r.includes("expert")) return "#0000ff";
  if (r.includes("specialist")) return "#03a89e";
  if (r.includes("pupil")) return "#008000";
  if (r.includes("newbie")) return "#808080";
  return "var(--foreground)";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
