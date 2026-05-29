"use client";

/*
 * Codeforces submission heatmap — wraps the shared ActivityHeatmap with
 * Codeforces' blue palette.
 */

import {
  ActivityHeatmap,
  PALETTE_CODEFORCES,
  type HeatmapDay,
} from "./ActivityHeatmap";

export function CodeforcesHeatmap({ data }: { data: HeatmapDay[] }) {
  return (
    <ActivityHeatmap
      data={data}
      palette={PALETTE_CODEFORCES}
      itemLabel="submissions"
      title="Submission activity"
    />
  );
}