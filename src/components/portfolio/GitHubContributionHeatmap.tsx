/*
 * GitHub contribution heatmap.
 *
 * Thin wrapper around the shared ActivityHeatmap so all three platform
 * heatmaps (GitHub, LeetCode, Codeforces) stay visually consistent and any
 * fix to the heatmap rendering only has to be made once.
 *
 * We accept the same shape the previous version did so the GitHubSection
 * caller doesn't need to change.
 */

import {
  ActivityHeatmap,
  PALETTE_GITHUB,
  type HeatmapDay,
} from "./ActivityHeatmap";

interface ContribDay extends HeatmapDay {}

export function GitHubContributionHeatmap({
  data,
}: {
  data: ContribDay[];
  // `total` previously came from GitHub's reported `contributionCalendar.totalContributions`.
  // We now derive it inside ActivityHeatmap from the day list so the number
  // always matches what's visually on screen — useful when the heatmap window
  // doesn't exactly match GitHub's window.
  total?: number;
}) {
  return (
    <ActivityHeatmap
      data={data}
      palette={PALETTE_GITHUB}
      itemLabel="contributions"
      title="Contributions"
    />
  );
}