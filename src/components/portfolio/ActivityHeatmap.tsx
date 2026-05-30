"use client";

import { useMemo, useState } from "react";

/*
 * ActivityHeatmap — shared full-year heatmap used by GitHub, LeetCode, and
 * Codeforces sections.
 *
 * Features:
 *  - 53-week full-year grid, month labels on top, Mon/Wed/Fri on left.
 *  - Stats line: total / active days / max streak (computed from the
 *    visible window so they match what's on screen).
 *  - Year selector: derives the set of years present in `data` and lets
 *    the user switch. Defaults to the year of the most recent activity.
 *  - Inline hex fills (CSS variables in SVG fills broke us three times).
 *  - Responsive: SVG stretches via viewBox + width="100%".
 *
 * Palette is per-platform (passed in), so GitHub stays green, LeetCode is
 * orange, Codeforces is blue.
 */

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface HeatmapPalette {
  empty: string;
  scale: [string, string, string, string];
}

interface Props {
  data: HeatmapDay[];
  palette: HeatmapPalette;
  itemLabel: string;
  title?: string;
}

const CELL = 13;
const SIZE = 11;
const MONTH_LABEL_H = 14;
const DAY_LABEL_W = 28;
const WEEKS = 53;

function bucketFor(count: number, scale: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  const r = count / scale;
  if (r >= 0.8) return 4;
  if (r >= 0.5) return 3;
  if (r >= 0.25) return 2;
  return 1;
}

function colorFor(count: number, scale: number, palette: HeatmapPalette): string {
  const b = bucketFor(count, scale);
  if (b === 0) return palette.empty;
  return palette.scale[b - 1];
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function ActivityHeatmap({ data, palette, itemLabel, title }: Props) {
  // Year selector: derive available years from data. Show years that
  // actually have data (no empty year slots). Default to most recent.
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    for (const d of data) {
      const y = Number(d.date.slice(0, 4));
      if (Number.isFinite(y)) set.add(y);
    }
    if (set.size === 0) set.add(new Date().getUTCFullYear());
    return [...set].sort((a, b) => b - a);
  }, [data]);

  const [selectedYear, setSelectedYear] = useState<number>(() => availableYears[0]);

  // Window the heatmap to end on Dec 31 of the selected year, unless that
  // year is the current year — then end on today (so the grid doesn't show
  // empty future months).
  const endDate = useMemo(() => {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    if (selectedYear === now.getUTCFullYear()) return now;
    const yearEnd = new Date(Date.UTC(selectedYear, 11, 31));
    return yearEnd;
  }, [selectedYear]);

  const { columns, stats, monthLabels, scale } = useMemo(() => {
    const counts = new Map(data.map((d) => [d.date, d.count]));

    const end = new Date(endDate);
    end.setUTCHours(0, 0, 0, 0);
    const dayOfWeek = end.getUTCDay();
    const lastSunday = new Date(end);
    lastSunday.setUTCDate(end.getUTCDate() - dayOfWeek);

    const columns: Array<Array<{ date: string; count: number } | null>> = [];
    const monthLabels: Array<{ x: number; label: string }> = [];
    let prevMonth = -1;

    for (let w = WEEKS - 1; w >= 0; w--) {
      const col: Array<{ date: string; count: number } | null> = [];
      const firstCellOfCol = new Date(lastSunday);
      firstCellOfCol.setUTCDate(lastSunday.getUTCDate() - w * 7);
      const m = firstCellOfCol.getUTCMonth();
      if (m !== prevMonth) {
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
        if (cell > end) {
          col.push(null);
          continue;
        }
        const key = cell.toISOString().slice(0, 10);
        col.push({ date: key, count: counts.get(key) ?? 0 });
      }
      columns.push(col);
    }

    let total = 0;
    let activeDays = 0;
    let maxStreak = 0;
    let cur = 0;
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

    return { columns, monthLabels, stats: { total, activeDays, maxStreak }, scale };
  }, [data, endDate]);

  if (data.length === 0) return null;

  const gridW = WEEKS * CELL;
  const gridH = 7 * CELL;
  const vbW = DAY_LABEL_W + gridW;
  const vbH = MONTH_LABEL_H + gridH;

  return (
    <div className="space-y-3">
      {/* Header: title + year selector + stats */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          {title && <div className="text-sm font-medium text-p-fg">{title}</div>}
          {availableYears.length > 1 && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              // Native <select> — no client framework needed, no styling
              // surprises across themes. Keep it minimal.
              className="rounded border border-p-border bg-p-surface px-2 py-0.5 text-xs text-p-fg"
              aria-label="Select year"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="text-xs text-p-fg-subtle">
          <span className="text-p-fg">{stats.total.toLocaleString()}</span>{" "}
          {itemLabel} ·{" "}
          <span className="text-p-fg">{stats.activeDays}</span> active days
          {stats.maxStreak > 1 && (
            <>
              {" "}· max streak{" "}
              <span className="text-p-fg">{stats.maxStreak}</span>
            </>
          )}
        </div>
      </div>

      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="xMinYMin meet"
        role="img"
        aria-label={`${title ?? itemLabel} heatmap for ${selectedYear}`}
        style={{ maxWidth: "100%", display: "block", overflow: "visible" }}
      >
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
                  <title>{`${cell.count} ${itemLabel} on ${cell.date}`}</title>
                </rect>
              ) : null,
            ),
          )}
        </g>
      </svg>
    </div>
  );
}

// Per-platform palettes — match each platform's actual visual identity.
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