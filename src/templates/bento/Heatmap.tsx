"use client";

import { useMemo, useState } from "react";
import styles from "./bento.module.css";

/*
 * Bento contribution / submission heatmap with year tabs.
 *
 * Visual treatment (Bento-specific):
 *   - Rounded 3px cells on a translucent track
 *   - Active cells fade up through teal (matches the gradient wallpaper)
 *   - Year tabs as small frosted-glass buttons
 *
 * Algorithm matches the Press and Brutalist heatmaps so behavior is
 * consistent across templates:
 *   - Available years derived from the input data
 *   - Default to most recent year on first render
 *   - Always renders a full Jan 1 → Dec 31 grid for the selected year
 *   - Future days for the current year render as blank (claim grid space
 *     but no fill) so spacing stays identical year-over-year
 *   - Level 0-4 bucketing using that year's max count as the upper bound
 *     (relative scale — a quiet user still gets visible activity)
 */

export function ContributionHeatmap({
  days,
  label,
}: {
  days: Array<{ date: string; count: number }>;
  /** Optional caption shown above the grid (e.g. "Submission activity"). */
  label?: string;
}) {
  const availableYears = useMemo(() => {
    return Array.from(
      new Set(days.map((d) => new Date(d.date).getFullYear())),
    ).sort((a, b) => b - a);
  }, [days]);

  const [selectedYear, setSelectedYear] = useState<number>(
    availableYears[0] ?? new Date().getFullYear(),
  );

  const filtered = useMemo(
    () =>
      days.filter((d) => new Date(d.date).getFullYear() === selectedYear),
    [days, selectedYear],
  );

  if (days.length === 0) return null;

  // No data for the selected year — show the picker and a notice. This
  // shouldn't happen in practice (we default to the most recent year that
  // HAS data) but it's a defensible fallback if the data shape is odd.
  if (filtered.length === 0) {
    return (
      <div className={styles.heatmapWrap}>
        {label && <div className={styles.heatmapLabel}>{label}</div>}
        {availableYears.length > 1 && (
          <YearTabs
            years={availableYears}
            selected={selectedYear}
            onSelect={setSelectedYear}
          />
        )}
        <div className={styles.heatmapEmpty}>No activity for {selectedYear}</div>
      </div>
    );
  }

  // Relative level bucketing — a quiet user's "1 commit" still reads as
  // activity (level 4). For active users, levels distribute across the
  // count distribution. Matches Press/Brutalist.
  const max = filtered.reduce((m, d) => (d.count > m ? d.count : m), 0);
  const levelFor = (count: number): -1 | 0 | 1 | 2 | 3 | 4 => {
    if (count === 0) return 0;
    if (max <= 1) return 4;
    const r = count / max;
    if (r > 0.75) return 4;
    if (r > 0.5) return 3;
    if (r > 0.25) return 2;
    return 1;
  };

  const windowStart = new Date(selectedYear, 0, 1);
  const windowEnd = new Date(selectedYear, 11, 31);
  const renderStart = new Date(windowStart);
  renderStart.setDate(renderStart.getDate() - renderStart.getDay());
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays =
    Math.floor((windowEnd.getTime() - renderStart.getTime()) / msPerDay) + 1;
  const totalWeeks = Math.ceil(totalDays / 7);

  const byDate = new Map(filtered.map((d) => [d.date, d.count]));

  const grid: Array<Array<-1 | 0 | 1 | 2 | 3 | 4>> = Array.from(
    { length: 7 },
    () => new Array<-1 | 0 | 1 | 2 | 3 | 4>(totalWeeks).fill(-1),
  );
  for (let w = 0; w < totalWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(renderStart);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      if (cellDate < windowStart || cellDate > windowEnd || cellDate > today) {
        grid[d][w] = -1;
        continue;
      }
      const y = cellDate.getFullYear();
      const m = String(cellDate.getMonth() + 1).padStart(2, "0");
      const dd = String(cellDate.getDate()).padStart(2, "0");
      const iso = `${y}-${m}-${dd}`;
      grid[d][w] = levelFor(byDate.get(iso) ?? 0);
    }
  }

  // Month labels: for each week column, use the month of the first
  // non-blank day in that column. Skip labels that would overlap (require
  // at least 2 columns between labels).
  const monthLabel = new Array<string>(totalWeeks).fill("");
  let prevMonth = -1;
  let lastLabelWeek = -10;
  for (let w = 0; w < totalWeeks; w++) {
    let firstRealDate: Date | null = null;
    for (let d = 0; d < 7; d++) {
      if (grid[d][w] !== -1) {
        const cd = new Date(renderStart);
        cd.setDate(cd.getDate() + w * 7 + d);
        firstRealDate = cd;
        break;
      }
    }
    if (!firstRealDate) continue;
    const m = firstRealDate.getMonth();
    if (m !== prevMonth) {
      if (w - lastLabelWeek >= 2) {
        monthLabel[w] = firstRealDate
          .toLocaleString("en-US", { month: "short" })
          .slice(0, 3);
        lastLabelWeek = w;
      }
      prevMonth = m;
    }
  }

  const totalCount = filtered.reduce((s, d) => s + d.count, 0);
  const activeDays = filtered.filter((d) => d.count > 0).length;

  return (
    <div className={styles.heatmapWrap}>
      <div className={styles.heatmapHeader}>
        <div>
          {label && <div className={styles.heatmapLabel}>{label}</div>}
          <div className={styles.heatmapMeta}>
            {totalCount.toLocaleString("en-US")} total · {activeDays} active days
          </div>
        </div>
        <div className={styles.heatmapLegend}>
          <span>less</span>
          <span className={`${styles.heatmapLegendCell} ${styles.l0}`} />
          <span className={`${styles.heatmapLegendCell} ${styles.l1}`} />
          <span className={`${styles.heatmapLegendCell} ${styles.l2}`} />
          <span className={`${styles.heatmapLegendCell} ${styles.l3}`} />
          <span className={`${styles.heatmapLegendCell} ${styles.l4}`} />
          <span>more</span>
        </div>
      </div>

      {availableYears.length > 1 && (
        <YearTabs
          years={availableYears}
          selected={selectedYear}
          onSelect={setSelectedYear}
        />
      )}

      <div
        className={styles.heatmapCalendar}
        style={{
          gridTemplateColumns: `repeat(${totalWeeks}, minmax(8px, 1fr))`,
        }}
      >
        {/* Month label row */}
        {monthLabel.map((m, i) => (
          <span key={`m-${i}`} className={styles.heatmapMonth}>
            {m || "\u00A0"}
          </span>
        ))}
        {/* Grid rows, day-by-day. We don't render the day-of-week labels —
         * Press doesn't either, and the grid is dense enough that the cells
         * speak for themselves. */}
        {Array.from({ length: 7 }).map((_, dRow) =>
          Array.from({ length: totalWeeks }).map((_, w) => {
            const level = grid[dRow][w];
            if (level === -1) {
              return <span key={`d-${dRow}-${w}`} className={styles.heatmapCellBlank} />;
            }
            return (
              <span
                key={`d-${dRow}-${w}`}
                className={`${styles.heatmapCell} ${styles[`l${level}`]}`}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

function YearTabs({
  years,
  selected,
  onSelect,
}: {
  years: number[];
  selected: number;
  onSelect: (year: number) => void;
}) {
  return (
    <div className={styles.heatmapYears}>
      {years.map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => onSelect(y)}
          className={styles.heatmapYearBtn}
          data-active={y === selected}
        >
          {y}
        </button>
      ))}
    </div>
  );
}