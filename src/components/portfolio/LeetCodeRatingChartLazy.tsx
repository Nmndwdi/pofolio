"use client";

import dynamic from "next/dynamic";

/*
 * Lazy wrapper for the LeetCode rating chart — keeps Recharts out of the
 * initial bundle (loads only when the chart mounts). Same rationale as the
 * Codeforces chart wrapper.
 */

const Chart = dynamic(
  () =>
    import("./LeetCodeRatingChart").then((m) => ({
      default: m.LeetCodeRatingChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-52 w-full animate-pulse rounded-md bg-p-surface-2" />
    ),
  },
);

interface RatingPoint {
  timestamp: number;
  rating: number;
  title: string;
}

export function LeetCodeRatingChartLazy({ data }: { data: RatingPoint[] }) {
  return <Chart data={data} />;
}
