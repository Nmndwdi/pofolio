"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
} from "recharts";

/*
 * Codeforces rating-history chart.
 *
 * Key change from prior versions: the tooltip is now a fully custom component
 * passed via Tooltip's `content` prop. Previously we tried to style Recharts'
 * default tooltip with contentStyle / itemStyle / labelStyle, which kept
 * rendering as a black box because (a) Recharts 3.x portals the tooltip out
 * of the chart's CSS context, and (b) some inner element kept inheriting a
 * dark background from somewhere. Owning the tooltip JSX outright sidesteps
 * all of that — no theme-variable resolution, no Recharts internals to fight.
 *
 * Stroke color is a concrete value (theme-toned but resolved here as a hex)
 * rather than `hsl(var(--p-fg))`, because Recharts' SVG path was sometimes
 * being painted with the unresolved string and disappearing.
 */

interface RatingPoint {
  timestamp: number;
  rating: number;
}

// Canonical Codeforces rank bands (background colors).
const RANK_BANDS: Array<[number, number, string]> = [
  [0, 1200, "#cccccc"],
  [1200, 1400, "#77ff77"],
  [1400, 1600, "#77ddbb"],
  [1600, 1900, "#aaaaff"],
  [1900, 2100, "#ff88ff"],
  [2100, 2300, "#ffcc88"],
  [2300, 2400, "#ffbb55"],
  [2400, 4000, "#ff7777"],
];

interface TooltipPayloadEntry {
  payload?: { t: number; rating: number };
}

/** Custom tooltip — fully owned JSX, no Recharts default styling. */
function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  const dateStr = new Date(point.t).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return (
    <div
      style={{
        // Inline styles only — no className, no theme-var resolution.
        background: "#ffffff",
        color: "#111111",
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 12,
        fontFamily: "inherit",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        pointerEvents: "none",
      }}
    >
      <div style={{ opacity: 0.6, fontSize: 11 }}>{dateStr}</div>
      <div style={{ fontWeight: 600, marginTop: 2 }}>
        Rating: {point.rating}
      </div>
    </div>
  );
}

export function CodeforcesRatingChart({ data }: { data: RatingPoint[] }) {
  if (data.length < 2) return null;

  const points = data.map((d) => ({
    t: d.timestamp * 1000,
    rating: d.rating,
  }));
  const ratings = points.map((p) => p.rating);
  const yMin = Math.max(0, Math.floor((Math.min(...ratings) - 100) / 100) * 100);
  const yMax = Math.ceil((Math.max(...ratings) + 100) / 100) * 100;
  const visibleBands = RANK_BANDS.filter(([lo, hi]) => hi > yMin && lo < yMax);

  // Concrete colors (not theme vars) — Recharts was failing to paint
  // unresolved `hsl(var(--))` strings. `currentColor` works on text but not
  // on SVG strokes inside the Recharts-managed subtree.
  const lineColor = "#111111";
  const axisColor = "#666666";
  const gridColor = "#dddddd";

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-p-fg">Rating history</div>
      <div className="h-56 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={points} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
            {visibleBands.map(([lo, hi, color]) => (
              <ReferenceArea
                key={`${lo}-${hi}`}
                y1={Math.max(lo, yMin)}
                y2={Math.min(hi, yMax)}
                fill={color}
                fillOpacity={0.18}
                strokeOpacity={0}
                ifOverflow="hidden"
              />
            ))}
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t) => new Date(t).getFullYear().toString()}
              tick={{ fontSize: 11, fill: axisColor }}
              stroke={gridColor}
              minTickGap={40}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 11, fill: axisColor }}
              stroke={gridColor}
              width={48}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: gridColor, strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="rating"
              stroke={lineColor}
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 4, fill: lineColor }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}