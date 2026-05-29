"use client";

import dynamic from "next/dynamic";

/*
 * Lazy wrapper for the Codeforces rating chart.
 *
 * Recharts is ~100 KB gzipped. The public portfolio page should load fast
 * for visitors, and the chart sits below the fold — so we lazy-load it
 * rather than shipping Recharts in the initial bundle. The chart only
 * downloads when this component mounts.
 *
 * `ssr: false` is safe here because this wrapper is itself a Client
 * Component (Next 16 only forbids ssr:false dynamic imports inside *Server*
 * Components). A small fixed-height placeholder holds the layout so nothing
 * shifts when the chart streams in.
 */

const Chart = dynamic(
  () =>
    import("./CodeforcesRatingChart").then((m) => ({
      default: m.CodeforcesRatingChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full animate-pulse rounded-md bg-p-surface-2" />
    ),
  },
);

interface RatingPoint {
  timestamp: number;
  rating: number;
}

export function CodeforcesRatingChartLazy({ data }: { data: RatingPoint[] }) {
  return <Chart data={data} />;
}
