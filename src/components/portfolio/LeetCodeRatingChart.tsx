"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

/*
 * LeetCode contest rating chart.
 *
 * Same custom-tooltip approach as the Codeforces chart — Recharts' default
 * tooltip was rendering as a black box despite contentStyle overrides, so we
 * own the tooltip JSX outright. See CodeforcesRatingChart.tsx for the
 * detailed explanation; same root cause, same fix.
 */

interface RatingPoint {
  timestamp: number;
  rating: number;
  title: string;
}

interface TooltipPayloadEntry {
  payload?: { t: number; rating: number; title: string };
}

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
        background: "#ffffff",
        color: "#111111",
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 12,
        fontFamily: "inherit",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        pointerEvents: "none",
        maxWidth: 220,
      }}
    >
      <div style={{ opacity: 0.6, fontSize: 11 }}>{dateStr}</div>
      <div
        style={{
          fontWeight: 500,
          marginTop: 2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {point.title}
      </div>
      <div style={{ fontWeight: 600, marginTop: 2 }}>
        Rating: {point.rating}
      </div>
    </div>
  );
}

export function LeetCodeRatingChart({ data }: { data: RatingPoint[] }) {
  if (data.length < 2) return null;

  const points = data.map((d) => ({
    t: d.timestamp * 1000,
    rating: d.rating,
    title: d.title,
  }));
  const ratings = points.map((p) => p.rating);
  const yMin = Math.floor((Math.min(...ratings) - 50) / 50) * 50;
  const yMax = Math.ceil((Math.max(...ratings) + 50) / 50) * 50;

  const lineColor = "#111111";
  const axisColor = "#666666";
  const gridColor = "#dddddd";

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-p-fg">Contest rating</div>
      {/* Same -1-width guard as the Codeforces chart; see comment there. */}
      <div className="h-52 min-h-[13rem] w-full min-w-[280px]">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <LineChart data={points} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
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