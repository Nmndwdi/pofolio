"use client";

/*
 * LeetCode submission heatmap — wraps the shared ActivityHeatmap with
 * LeetCode's orange palette.
 */

import {
  ActivityHeatmap,
  PALETTE_LEETCODE,
  type HeatmapDay,
} from "./ActivityHeatmap";

export function LeetCodeHeatmap({ data }: { data: HeatmapDay[] }) {
  return (
    <ActivityHeatmap
      data={data}
      palette={PALETTE_LEETCODE}
      itemLabel="submissions"
      title="Submission activity"
    />
  );
}