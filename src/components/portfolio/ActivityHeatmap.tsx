"use client";

import { useMemo } from "react";

/*
 * ActivityHeatmap — shared full-year heatmap used by GitHub, LeetCode, and
 * Codeforces sections. Replaces the previous three near-identical 26-week
 * grids that looked cramped vs. the platforms' own heatmaps.
 *
 * What this gives you (matching the visual richness of leetcode.com /
 * codeforces.com / github.com profiles):
 *  - 53-week full-year grid (not 26)
 *  - Month labels along the top
 *  - Day-of-week labels (Mon/Wed/Fri) on the left
 *  - Stats line: total / active days / max streak
 *  - Inline hex fills (no CSS variables in SVG — that approach burned us
 *    three times in this conversation)
 *  - Responsive: SVG stretches to container via viewBox + width="100%"
 *
 * Palette is per-platform (passed in), so GitHub stays green, LeetCode is
 * orange, Codeforces is blue — matching the source.
 *
 * `endDate` defaults to today; pass an earlier date to render a previous
 * year (useful when we add a year selector later).
 */

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface HeatmapPalette {
  // 5 colors: empty, low, med-low, med-high, high.
  empty: string;
  scale: [string, string, string, string]; // 4 active levels
}

interface Props {
  data: HeatmapDay[];
  palette: HeatmapPalette;
  /** Label like "submissions" / "contributions" — used in tooltip + stats. */
  itemLabel: string;
  /** Optional title; if omitted, no header rendered. */
  title?: string;
  /** End of the window. Defaults to "today" in local UTC. */
  endDate?: Date;
}

// SVG units. Cells stretch via width="100%" + viewBox.
const CELL = 13;
const SIZE = 11;
const MONTH_LABEL_H = 14;
const DAY_LABEL_W = 28;
const WEEKS = 53; // full year

function bucketFor(count: number, scale: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  const r = count / scale;
  if (r >= 0.8) return 4;
  if (r >= 0.5) return 3;
  if (r >= 0.25) return 2;
  return 1;
}

function colorFor(
  count: number,
  scale: number,
  palette: HeatmapPalette,
): string {
  const b = bucketFor(count, scale);
  if (b === 0) return palette.empty;
  return palette.scale[b - 1];
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function ActivityHeatmap({
  data,
  palette,
  itemLabel,
  title,
  endDate,
}: Props) {
  // useMemo guards against rebuilding the grid on every parent re-render,
  // which matters because we walk 371 cells.
  const { columns, stats, monthLabels, scale } = useMemo(() => {
    const counts = new Map(data.map((d) => [d.date, d.count]));

    const today = endDate ? new Date(endDate) : new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dayOfWeek = today.getUTCDay();
    const lastSunday = new Date(today);
    lastSunday.setUTCDate(today.getUTCDate() - dayOfWeek);

    // Build columns oldest → newest, exactly WEEKS columns.
    const columns: Array<Array<{ date: string; count: number } | null>> = [];
    // Month-label positions: track the first column where each new month starts.
    const monthLabels: Array<{ x: number; label: string }> = [];
    let prevMonth = -1;

    for (let w = WEEKS - 1; w >= 0; w--) {
      const col: Array<{ date: string; count: number } | null> = [];
      const firstCellOfCol = new Date(lastSunday);
      firstCellOfCol.setUTCDate(lastSunday.getUTCDate() - w * 7);
      const m = firstCellOfCol.getUTCMonth();
      if (m !== prevMonth) {
        // Don't crowd: only label if this is past the leftmost ~3 columns of
        // the previous label, otherwise the labels overlap.
        const colIdx = WEEKS - 1 - w;
        const lastLabelX = monthLabels.length
          ? monthLabels[monthLabels.length - 1].x
          : -10;
        if (colIdx - lastLabelX >= 3) {
          monthLabels.push({ x: colIdx, label: MONTH_NAMES[m] });
        }
        prevMonth = m;
      }
      for (let d = 0; d < 7; d++) {
        const cell = new Date(lastSunday);
        cell.setUTCDate(lastSunday.getUTCDate() - w * 7 + d);
        if (cell > today) {
          col.push(null);
          continue;
        }
        const key = cell.toISOString().slice(0, 10);
        col.push({ date: key, count: counts.get(key) ?? 0 });
      }
      columns.push(col);
    }

    // Stats. We only count days in the visible window so they line up with
    // what the grid shows.
    let total = 0;
    let activeDays = 0;
    let maxStreak = 0;
    let cur = 0;
    // Walk the grid in chronological order (column by column, each top→bottom
    // is Sunday→Saturday).
    for (const col of columns) {
      for (const cell of col) {
        if (!cell) continue;
        total += cell.count;
        if (cell.count > 0) {
          activeDays += 1;
          cur += 1;
          if (cur > maxStreak) maxStreak = cur;
        } else {
          cur = 0;
        }
      }
    }

    const observedMax = Math.max(0, ...data.map((d) => d.count));
    const scale = Math.max(4, observedMax);

    return {
      columns,
      monthLabels,
      stats: { total, activeDays, maxStreak },
      scale,
    };
  }, [data, endDate]);

  if (data.length === 0) return null;

  // SVG dimensions in viewBox units.
  const gridW = WEEKS * CELL;
  const gridH = 7 * CELL;
  const vbW = DAY_LABEL_W + gridW;
  const vbH = MONTH_LABEL_H + gridH;

  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-sm font-medium text-p-fg">{title}</div>
          <div className="text-xs text-p-fg-subtle">
            <span className="text-p-fg">{stats.total.toLocaleString()}</span>{" "}
            {itemLabel} ·{" "}
            <span className="text-p-fg">{stats.activeDays}</span> active days
            {stats.maxStreak > 1 && (
              <>
                {" "}
                · max streak{" "}
                <span className="text-p-fg">{stats.maxStreak}</span>
              </>
            )}
          </div>
        </div>
      )}
      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="xMinYMin meet"
        role="img"
        aria-label={`${title ?? itemLabel} heatmap`}
        style={{ maxWidth: "100%", display: "block", overflow: "visible" }}
      >
        {/* Month labels */}
        {monthLabels.map(({ x, label }) => (
          <text
            key={`m-${x}-${label}`}
            x={DAY_LABEL_W + x * CELL}
            y={MONTH_LABEL_H - 4}
            fontSize="9"
            fill="currentColor"
            opacity="0.55"
          >
            {label}
          </text>
        ))}
        {/* Day-of-week labels (Mon/Wed/Fri only — avoids crowding) */}
        {(["Mon", "Wed", "Fri"] as const).map((label, i) => {
          const dayIdx = i === 0 ? 1 : i === 1 ? 3 : 5;
          return (
            <text
              key={label}
              x={0}
              y={MONTH_LABEL_H + dayIdx * CELL + 9}
              fontSize="9"
              fill="currentColor"
              opacity="0.55"
            >
              {label}
            </text>
          );
        })}
        {/* Cells */}
        <g transform={`translate(${DAY_LABEL_W}, ${MONTH_LABEL_H})`}>
          {columns.map((col, x) =>
            col.map((cell, y) =>
              cell ? (
                <rect
                  key={`${x}-${y}`}
                  x={x * CELL}
                  y={y * CELL}
                  width={SIZE}
                  height={SIZE}
                  rx={2}
                  style={{ fill: colorFor(cell.count, scale, palette) }}
                >
                  <title>{`${cell.count} ${itemLabel}${cell.count === 1 ? "" : ""} on ${cell.date}`}</title>
                </rect>
              ) : null,
            ),
          )}
        </g>
      </svg>
    </div>
  );
}

// ─── Per-platform palettes ──────────────────────────────────────────────────
// Hand-picked to match each platform's actual visual identity.

export const PALETTE_GITHUB: HeatmapPalette = {
  empty: "#ebedf0",
  scale: ["#9be9a8", "#40c463", "#30a14e", "#216e39"],
};

export const PALETTE_LEETCODE: HeatmapPalette = {
  empty: "#ebedf0",
  scale: ["#ffd285", "#ffa116", "#e69100", "#a36600"],
};

export const PALETTE_CODEFORCES: HeatmapPalette = {
  empty: "#ebedf0",
  scale: ["#c6dbef", "#6baed6", "#3182bd", "#08519c"],
};