import Link from "next/link";
import type { LeetCodeData } from "@/lib/integrations/leetcode";
import { LeetCodeHeatmap } from "./LeetCodeHeatmap";
import { LeetCodeRatingChartLazy } from "./LeetCodeRatingChartLazy";

/*
 * LeetCode section renderer.
 *
 * Headline: total solved + global ranking.
 * Body: three mini bars (easy / medium / hard) showing solved count,
 *       sized relative to the total problem counts on LeetCode.
 *
 * The reference numbers below are LeetCode's public problem totals as of
 * end-2025. They drift slowly; if they're significantly off the bars will
 * just look slightly compressed/stretched. Not worth fetching dynamically
 * just to anchor a visual scale.
 */

// As of ~2025-12: ~875 easy, ~1900 medium, ~860 hard. These aren't exact
// (LeetCode adds new problems weekly) but bar widths only need to be
// roughly proportional to look correct.
const TOTALS = { easy: 875, medium: 1900, hard: 860 };

export function LeetCodeSection({ data }: { data: LeetCodeData }) {
  const profileUrl = `https://leetcode.com/u/${data.username}/`;

  return (
    <section className="space-y-6">
      {/* Hero: giant solved count */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        <div className="font-p-display text-7xl leading-none tracking-tight sm:text-8xl">
          {data.totalSolved}
        </div>
        <div className="space-y-1 pb-1">
          <Link
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm font-medium hover:underline"
          >
            @{data.username}
            {data.realName && data.realName !== data.username && (
              <span className="ml-2 text-p-fg-muted">({data.realName})</span>
            )}
          </Link>
          <div className="font-p-display text-lg italic text-p-fg-muted">
            problems solved
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-p-fg-muted">
            {data.ranking != null && data.ranking > 0 && (
              <span>
                rank{" "}
                <span className="text-p-fg">
                  {data.ranking.toLocaleString()}
                </span>
              </span>
            )}
            {data.country && <span>{data.country}</span>}
            {data.currentStreak > 0 && (
              <span>
                <span className="text-p-fg">{data.currentStreak}</span> day
                streak
              </span>
            )}
            {data.totalActiveDays > 0 && (
              <span>
                <span className="text-p-fg">{data.totalActiveDays}</span> active
                days
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <DifficultyBar
          label="Easy"
          solved={data.easySolved}
          total={TOTALS.easy}
          color="#00b8a3"
        />
        <DifficultyBar
          label="Medium"
          solved={data.mediumSolved}
          total={TOTALS.medium}
          color="#ffc01e"
        />
        <DifficultyBar
          label="Hard"
          solved={data.hardSolved}
          total={TOTALS.hard}
          color="#ff375f"
        />
      </div>

      {/* Submission heatmap — only if there's activity data. Defensive
          `?? []` because cached LeetCode rows written before these fields
          were added would otherwise crash on `.length`. */}
      {(data.submissionHeatmap ?? []).length > 0 && (
        <LeetCodeHeatmap data={data.submissionHeatmap ?? []} />
      )}

      {/* Contest rating chart — only if they've competed in 2+ contests. */}
      {(data.contestHistory ?? []).length >= 2 && (
        <LeetCodeRatingChartLazy data={data.contestHistory ?? []} />
      )}
    </section>
  );
}

function DifficultyBar({
  label,
  solved,
  total,
  color,
}: {
  label: string;
  solved: number;
  total: number;
  color: string;
}) {
  // Cap at 100 in case our reference TOTALS are stale and someone has solved
  // more than we think exist.
  const pct = Math.min(100, total > 0 ? (solved / total) * 100 : 0);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium" style={{ color }}>
          {label}
        </span>
        <span className="font-mono text-p-fg-muted">
          {solved}
          <span className="text-p-fg-muted/60"> / {total}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
