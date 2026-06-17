"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LayoutData } from "@/components/layouts/types";
import { deriveUrl } from "@/lib/cloudinary-url";
import { ProjectModal } from "./ProjectModal";
import styles from "./cinematic.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/*
 * Cinematic — choreographed scroll-jacked sequence.
 *
 * NOT a 3D world. NOT discrete scenes with cuts. ONE continuous staged
 * sequence: identity sits on stage, exits in a stretch+fade, experience
 * cards fly in then implode to a point, platform cards rain down, each
 * one swings to the left and unfurls full info on the right, all of
 * them burst outward, the featured project lands, dies, all other
 * projects appear in a grid, each reveals itself with a varied effect,
 * files + certifications, then education, then end.
 *
 * Tech:
 *   - Pinned viewport while a GSAP timeline scrubs against scroll
 *   - All stage elements live in one fixed stage; we manipulate their
 *     position/scale/rotation/opacity via the timeline
 *   - No 3D scene this time — just disciplined 2D + a touch of CSS 3D
 *
 * Lessons applied from prior attempts:
 *   - All derived data (platform list, featured project) is memoized so
 *     scroll-induced re-renders don't bust the GSAP useEffect deps
 *   - gsap.context() scopes & cleans up all tweens + ScrollTrigger on
 *     unmount
 *   - CSS sets sensible "off-stage" defaults so there's no flash of
 *     unstyled content before GSAP runs
 */

interface PlatformSpec {
  key: string;
  title: string;
  handle: string;
  url: string;
  letter: string;
  info: React.ReactNode;
}

/* ─── Helpers ────────────────────────────────────────────────── */

function computeMaxStreak(
  days: Array<{ date: string; count: number }>,
): number {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let max = 0;
  let cur = 0;
  let lastDate: Date | null = null;
  for (const d of sorted) {
    if (d.count > 0) {
      const date = new Date(d.date);
      if (lastDate) {
        const diff =
          (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) cur++;
        else cur = 1;
      } else {
        cur = 1;
      }
      max = Math.max(max, cur);
      lastDate = date;
    } else {
      lastDate = null;
      cur = 0;
    }
  }
  return max;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.statCell}>
      <div className={styles.statVal}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

/* Compact heatmap for the platform info panels — proper grid spanning the
 * full selected year (Jan→Dec) or the data range when year === "ALL".
 * Mirrors the spatial-walk Cards.tsx heatmap fix: build the grid by
 * iterating every day in the range so months with no activity still
 * render. */
function MiniHeatmap({
  days,
  year,
  accent = "#9fb0ff",
}: {
  days: Array<{ date: string; count: number }>;
  year: string;
  accent?: string;
}) {
  if (days.length === 0) return null;
  const countByDate = new Map<string, number>();
  for (const d of days) countByDate.set(d.date, d.count);

  let rangeStart: Date;
  let rangeEnd: Date;
  if (year === "ALL") {
    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
    rangeStart = new Date(sorted[0].date + "T00:00:00Z");
    rangeEnd = new Date(sorted[sorted.length - 1].date + "T00:00:00Z");
  } else {
    rangeStart = new Date(`${year}-01-01T00:00:00Z`);
    rangeEnd = new Date(`${year}-12-31T00:00:00Z`);
  }

  // Align to Sunday on or before rangeStart
  const gridStart = new Date(rangeStart);
  gridStart.setUTCDate(rangeStart.getUTCDate() - rangeStart.getUTCDay());

  let max = 0;
  const cells: Array<{ x: number; y: number; count: number; date: string }> = [];
  const cursor = new Date(gridStart);
  while (cursor.getTime() <= rangeEnd.getTime()) {
    const diff = Math.floor(
      (cursor.getTime() - gridStart.getTime()) / 86400000,
    );
    const week = Math.floor(diff / 7);
    const dow = diff % 7;
    const dateStr = cursor.toISOString().slice(0, 10);
    const count = countByDate.get(dateStr) ?? 0;
    cells.push({ x: week, y: dow, count, date: dateStr });
    if (count > max) max = count;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const weeks = cells.length > 0 ? Math.max(...cells.map((c) => c.x)) + 1 : 0;

  // Parse accent into rgb for opacity scaling
  let r = 159, g = 176, b = 255; // default #9fb0ff
  if (accent.startsWith("#") && accent.length === 7) {
    r = parseInt(accent.slice(1, 3), 16);
    g = parseInt(accent.slice(3, 5), 16);
    b = parseInt(accent.slice(5, 7), 16);
  }
  const CELL = 11;
  const SIZE = 9;
  const ROWS = 7;
  const W = weeks * CELL;
  const H = ROWS * CELL;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMinYMid meet"
      style={{ display: "block", width: "100%", height: "auto" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {cells.map((c, i) => {
        const intensity = max > 0 ? c.count / max : 0;
        const fill =
          c.count === 0
            ? `rgba(${r}, ${g}, ${b}, 0.08)`
            : `rgba(${r}, ${g}, ${b}, ${0.25 + intensity * 0.7})`;
        return (
          <rect
            key={i}
            x={c.x * CELL}
            y={c.y * CELL}
            width={SIZE}
            height={SIZE}
            fill={fill}
            rx="1"
          />
        );
      })}
    </svg>
  );
}

/* Year tab strip used in platform info panels.
 * Extracts unique YYYY values from heatmap data, prepends "ALL", lets the
 * user filter the heatmap below. Hidden if there's only one year of data. */
function getAvailableYears(days: Array<{ date: string; count: number }>) {
  const yearSet = new Set<string>();
  for (const d of days) {
    if (d.count > 0) yearSet.add(d.date.slice(0, 4));
  }
  const years = Array.from(yearSet).sort().reverse();
  return ["ALL", ...years];
}

function YearTabs({
  years,
  value,
  onChange,
}: {
  years: string[];
  value: string;
  onChange: (y: string) => void;
}) {
  if (years.length <= 2) return null; // Only "ALL" + 1 year — no point showing
  return (
    <div className={styles.yearTabs}>
      {years.map((y) => (
        <button
          key={y}
          type="button"
          className={`${styles.yearTab} ${y === value ? styles.yearTabActive : ""}`}
          onClick={() => onChange(y)}
        >
          {y}
        </button>
      ))}
    </div>
  );
}

/* Compact sparkline for rating history etc. */
function MiniSparkline({
  points,
  stroke = "#9fb0ff",
}: {
  points: Array<{ t: number; v: number }>;
  stroke?: string;
}) {
  const sorted = [...points].sort((a, b) => a.t - b.t);
  if (sorted.length < 2) return null;
  const W = 300;
  const H = 48;
  const padX = 4;
  const padY = 6;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const vs = sorted.map((p) => p.v);
  const vMin = Math.min(...vs);
  const vMax = Math.max(...vs);
  const vSpan = vMax - vMin || 1;
  const ts = sorted.map((p) => p.t);
  const tMin = Math.min(...ts);
  const tMax = Math.max(...ts);
  const tSpan = tMax - tMin || 1;
  const xy = sorted.map((p) => {
    const x = padX + ((p.t - tMin) / tSpan) * innerW;
    const y = padY + (1 - (p.v - vMin) / vSpan) * innerH;
    return [x, y] as const;
  });
  const linePath = xy
    .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(" ");
  const areaPath = `${linePath} L${xy[xy.length - 1][0]},${H - padY} L${xy[0][0]},${H - padY} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: "block", width: "100%", height: "48px" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={areaPath} fill={stroke} fillOpacity="0.12" />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Platform info panels ───────────────────────────────────── */

function GitHubInfo({ g }: { g: NonNullable<LayoutData["github"]>["data"] }) {
  const heatmapDays = useMemo(
    () => g.contributions?.days ?? [],
    [g.contributions?.days],
  );
  const years = useMemo(() => getAvailableYears(heatmapDays), [heatmapDays]);
  const [year, setYear] = useState<string>(years[0] ?? "ALL");
  const topLangs = (g.languageBreakdown ?? []).slice(0, 5);
  const langTotal = topLangs.reduce((s, l) => s + l.count, 0) || 1;
  return (
    <div>
      <div className={styles.platformInfoKicker}>Guild · GitHub</div>
      <h3 className={styles.platformInfoTitle}>Code</h3>
      <a
        href={`https://github.com/${g.user.login}`}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.platformInfoHandle}
      >
        @{g.user.login}{g.user.name ? ` · ${g.user.name}` : ""} ↗
      </a>
      <div className={styles.statsGrid}>
        <Stat value={g.user.publicRepos.toLocaleString("en-US")} label="Repos" />
        <Stat value={g.totalStars.toLocaleString("en-US")} label="Stars" />
        <Stat value={g.user.followers.toLocaleString("en-US")} label="Followers" />
        <Stat
          value={(g.contributions?.total ?? 0).toLocaleString("en-US")}
          label="Year contribs"
        />
      </div>
      {topLangs.length > 0 && (
        <div className={styles.miniSection}>
          <div className={styles.miniSectionHead}>Top languages</div>
          <div className={styles.langBars}>
            {topLangs.map((l) => (
              <div key={l.language} className={styles.langBar}>
                <span className={styles.langBarName}>{l.language}</span>
                <span className={styles.langBarTrack}>
                  <span
                    className={styles.langBarFill}
                    style={{ width: `${(l.count / langTotal) * 100}%` }}
                  />
                </span>
                <span className={styles.langBarCount}>{l.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {g.topRepos && g.topRepos.length > 0 && (
        <div className={styles.miniSection}>
          <div className={styles.miniSectionHead}>Top repos</div>
          <div className={styles.repoList}>
            {g.topRepos.slice(0, 4).map((r) => (
              <a
                key={r.fullName}
                href={r.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.repoItem}
              >
                <span className={styles.repoName}>{r.name}</span>
                <span className={styles.repoMeta}>
                  ★ {r.stars}{r.language ? ` · ${r.language}` : ""}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
      {heatmapDays.length > 0 && (
        <div className={styles.miniSection}>
          <div className={styles.miniSectionHead}>
            <span>Contributions</span>
            <YearTabs years={years} value={year} onChange={setYear} />
          </div>
          <MiniHeatmap days={heatmapDays} year={year} accent="#9fb0ff" />
        </div>
      )}
    </div>
  );
}
function LeetCodeInfo({
  l,
}: {
  l: NonNullable<LayoutData["leetcode"]>["data"];
}) {
  const TOTAL_EASY = 875, TOTAL_MEDIUM = 1900, TOTAL_HARD = 860;
  const heatmapDays = useMemo(
    () => l.submissionHeatmap ?? [],
    [l.submissionHeatmap],
  );
  const years = useMemo(() => getAvailableYears(heatmapDays), [heatmapDays]);
  const [year, setYear] = useState<string>(years[0] ?? "ALL");
  const maxStreak = computeMaxStreak(heatmapDays);
  const peakRating = l.contestHistory?.length
    ? Math.max(...l.contestHistory.map((c) => c.rating))
    : null;
  const totalSubmissions = heatmapDays.reduce((s, d) => s + d.count, 0);
  return (
    <div>
      <div className={styles.platformInfoKicker}>Guild · LeetCode</div>
      <h3 className={styles.platformInfoTitle}>Problem solving</h3>
      <a
        href={`https://leetcode.com/u/${l.username}/`}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.platformInfoHandle}
      >
        @{l.username}{l.realName ? ` · ${l.realName}` : ""}{l.country ? ` · ${l.country}` : ""} ↗
      </a>
      <div className={styles.statsGrid}>
        <Stat value={String(l.totalSolved)} label="Solved" />
        <Stat
          value={l.ranking !== null ? l.ranking.toLocaleString("en-US") : "—"}
          label="Global rank"
        />
        <Stat value={String(l.currentStreak ?? 0)} label="Curr streak" />
        <Stat value={String(maxStreak)} label="Max streak" />
      </div>
      <div className={styles.diffBars}>
        <div className={styles.diffBar}>
          <span className={styles.diffBarLabel}>Easy</span>
          <span className={styles.diffBarTrack}>
            <span
              className={`${styles.diffBarFill} ${styles.diffBarFillEasy}`}
              style={{ width: `${Math.min(100, ((l.easySolved ?? 0) / TOTAL_EASY) * 100)}%` }}
            />
          </span>
          <span className={styles.diffBarCount}>{l.easySolved ?? 0} / {TOTAL_EASY}</span>
        </div>
        <div className={styles.diffBar}>
          <span className={styles.diffBarLabel}>Medium</span>
          <span className={styles.diffBarTrack}>
            <span
              className={`${styles.diffBarFill} ${styles.diffBarFillMedium}`}
              style={{ width: `${Math.min(100, ((l.mediumSolved ?? 0) / TOTAL_MEDIUM) * 100)}%` }}
            />
          </span>
          <span className={styles.diffBarCount}>{l.mediumSolved ?? 0} / {TOTAL_MEDIUM}</span>
        </div>
        <div className={styles.diffBar}>
          <span className={styles.diffBarLabel}>Hard</span>
          <span className={styles.diffBarTrack}>
            <span
              className={`${styles.diffBarFill} ${styles.diffBarFillHard}`}
              style={{ width: `${Math.min(100, ((l.hardSolved ?? 0) / TOTAL_HARD) * 100)}%` }}
            />
          </span>
          <span className={styles.diffBarCount}>{l.hardSolved ?? 0} / {TOTAL_HARD}</span>
        </div>
      </div>
      <div className={styles.statsGrid}>
        <Stat value={String(l.totalActiveDays ?? 0)} label="Active days" />
        <Stat value={String(l.contestHistory?.length ?? 0)} label="Contests" />
        <Stat value={peakRating !== null ? String(peakRating) : "—"} label="Peak rating" />
        <Stat value={String(totalSubmissions)} label="Submissions" />
      </div>
      {l.contestHistory && l.contestHistory.length >= 2 && (
        <div className={styles.miniSection}>
          <div className={styles.miniSectionHead}>Contest rating</div>
          <MiniSparkline
            points={l.contestHistory.map((c) => ({ t: c.timestamp, v: c.rating }))}
            stroke="#b8a8ff"
          />
        </div>
      )}
      {l.submissionHeatmap && l.submissionHeatmap.length > 0 && (
        <div className={styles.miniSection}>
          <div className={styles.miniSectionHead}>
            <span>Submissions</span>
            <YearTabs years={years} value={year} onChange={setYear} />
          </div>
          <MiniHeatmap days={heatmapDays} year={year} accent="#ffb86b" />
        </div>
      )}
    </div>
  );
}

function CodeforcesInfo({
  c,
}: {
  c: NonNullable<LayoutData["codeforces"]>["data"];
}) {
  const heatmapDays = useMemo(
    () => c.submissionHeatmap ?? [],
    [c.submissionHeatmap],
  );
  const years = useMemo(() => getAvailableYears(heatmapDays), [heatmapDays]);
  const [year, setYear] = useState<string>(years[0] ?? "ALL");
  const activeDays = heatmapDays.filter((d) => d.count > 0).length;
  const maxStreak = computeMaxStreak(heatmapDays);
  return (
    <div>
      <div className={styles.platformInfoKicker}>Guild · Codeforces</div>
      <h3 className={styles.platformInfoTitle}>Competitive</h3>
      <a
        href={`https://codeforces.com/profile/${c.user.handle}`}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.platformInfoHandle}
      >
        @{c.user.handle}{c.user.rank ? ` · ${c.user.rank}` : ""}{c.user.country ? ` · ${c.user.country}` : ""} ↗
      </a>
      <div className={styles.statsGrid}>
        <Stat
          value={c.user.rating !== null ? String(c.user.rating) : "—"}
          label="Rating"
        />
        <Stat
          value={c.user.maxRating !== null ? String(c.user.maxRating) : "—"}
          label="Max rating"
        />
        <Stat value={String(c.contestsParticipated ?? 0)} label="Contests" />
        <Stat value={String(activeDays)} label="Active days" />
      </div>
      <div className={styles.statsGrid}>
        <Stat value={c.user.maxRank ?? "—"} label="Max rank" />
        <Stat value={String(maxStreak)} label="Max streak" />
        <Stat value={String(c.user.contribution ?? 0)} label="Karma" />
        <Stat
          value={String(
            (c.submissionHeatmap ?? []).reduce((s, d) => s + d.count, 0),
          )}
          label="Submissions"
        />
      </div>
      {c.ratingHistory && c.ratingHistory.length >= 2 && (
        <div className={styles.miniSection}>
          <div className={styles.miniSectionHead}>Rating history</div>
          <MiniSparkline
            points={c.ratingHistory.map((r) => ({ t: r.timestamp, v: r.rating }))}
            stroke="#ffb86b"
          />
        </div>
      )}
      {c.recentContests && c.recentContests.length > 0 && (
        <div className={styles.miniSection}>
          <div className={styles.miniSectionHead}>Recent contests</div>
          <div className={styles.repoList}>
            {c.recentContests.slice(0, 4).map((rc) => {
              const delta = rc.newRating - rc.oldRating;
              return (
                <div key={rc.contestId} className={styles.repoItem}>
                  <span className={styles.repoName}>{rc.contestName}</span>
                  <span className={styles.repoMeta}>
                    #{rc.rank} · {delta >= 0 ? `+${delta}` : delta}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {c.submissionHeatmap && c.submissionHeatmap.length > 0 && (
        <div className={styles.miniSection}>
          <div className={styles.miniSectionHead}>
            <span>Submissions</span>
            <YearTabs years={years} value={year} onChange={setYear} />
          </div>
          <MiniHeatmap days={heatmapDays} year={year} accent="#ff7b7b" />
        </div>
      )}
    </div>
  );
}

function DevtoInfo({ d }: { d: NonNullable<LayoutData["devto"]>["data"] }) {
  return (
    <div>
      <div className={styles.platformInfoKicker}>Tomes · Dev.to</div>
      <h3 className={styles.platformInfoTitle}>Recent essays</h3>
      <a
        href={`https://dev.to/${d.username}`}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.platformInfoHandle}
      >
        @{d.username} ↗
      </a>
      <div className={styles.articleList}>
        {d.articles.slice(0, 6).map((a) => (
          <a
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.articleItem}
          >
            <div className={styles.articleTitle}>{a.title}</div>
            <div className={styles.articleMeta}>
              {a.readingTimeMinutes ? `${a.readingTimeMinutes} min · ` : ""}
              {new Date(a.publishedAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function HuggingFaceInfo({
  h,
}: {
  h: NonNullable<LayoutData["huggingface"]>["data"];
}) {
  return (
    <div>
      <div className={styles.platformInfoKicker}>Artifacts · Hugging Face</div>
      <h3 className={styles.platformInfoTitle}>Models &amp; datasets</h3>
      <a
        href={`https://huggingface.co/${h.username}`}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.platformInfoHandle}
      >
        @{h.username} ↗
      </a>
      <div className={styles.articleList}>
        {h.items.slice(0, 6).map((it) => (
          <a
            key={`${it.kind}-${it.id}`}
            href={it.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.articleItem}
          >
            <div className={styles.articleTitle}>{it.name}</div>
            <div className={styles.articleMeta}>
              {it.kind}{it.likes > 0 ? ` · ♥ ${it.likes}` : ""}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function buildPlatforms(data: LayoutData): PlatformSpec[] {
  const out: PlatformSpec[] = [];
  if (data.github?.data) {
    out.push({
      key: "github",
      title: "GitHub",
      handle: `@${data.github.data.user.login}`,
      url: `https://github.com/${data.github.data.user.login}`,
      letter: "G",
      info: <GitHubInfo g={data.github.data} />,
    });
  }
  if (data.leetcode?.data) {
    out.push({
      key: "leetcode",
      title: "LeetCode",
      handle: `@${data.leetcode.data.username}`,
      url: `https://leetcode.com/u/${data.leetcode.data.username}/`,
      letter: "L",
      info: <LeetCodeInfo l={data.leetcode.data} />,
    });
  }
  if (data.codeforces?.data) {
    out.push({
      key: "codeforces",
      title: "Codeforces",
      handle: `@${data.codeforces.data.user.handle}`,
      url: `https://codeforces.com/profile/${data.codeforces.data.user.handle}`,
      letter: "C",
      info: <CodeforcesInfo c={data.codeforces.data} />,
    });
  }
  if (data.devto?.data) {
    out.push({
      key: "devto",
      title: "Dev.to",
      handle: `@${data.devto.data.username}`,
      url: `https://dev.to/${data.devto.data.username}`,
      letter: "D",
      info: <DevtoInfo d={data.devto.data} />,
    });
  }
  if (data.huggingface?.data) {
    out.push({
      key: "huggingface",
      title: "Hugging Face",
      handle: `@${data.huggingface.data.username}`,
      url: `https://huggingface.co/${data.huggingface.data.username}`,
      letter: "H",
      info: <HuggingFaceInfo h={data.huggingface.data} />,
    });
  }
  return out;
}

/* ─── Main component ─────────────────────────────────────────── */

const TRACK_VH = 1800;

export function Cinematic({ data }: { data: LayoutData }) {
  const [openProject, setOpenProject] = useState<
    LayoutData["projects"][number] | null
  >(null);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState("Identity");

  /* Derived data — memoized so useEffect deps stay stable */
  const platforms = useMemo(() => buildPlatforms(data), [data]);
  const featured = useMemo(() => data.projects[0] ?? null, [data.projects]);
  const otherProjects = useMemo(() => data.projects.slice(1), [data.projects]);
  const hasFiles = !!data.resumeCloudinaryId || data.files.length > 0;
  const filesList = useMemo(() => {
    const out: Array<{ id: string; label: string; href: string; format: string }> = [];
    if (data.resumeCloudinaryId) {
      out.push({
        id: "resume",
        label: "Resume",
        href: deriveUrl(data.resumeCloudinaryId, { resourceType: "raw" }),
        format: "pdf",
      });
    }
    for (const f of data.files) {
      out.push({
        id: f.id,
        label: f.label,
        href: deriveUrl(f.publicId, { resourceType: f.resourceType }),
        format: f.format,
      });
    }
    return out;
  }, [data.resumeCloudinaryId, data.files]);

  // Flattened skill list (skillGroups take precedence if present)
  const skillsList = useMemo(() => {
    if (data.skillGroups.length > 0) {
      const out: string[] = [];
      for (const g of data.skillGroups) {
        for (const s of g.skills) out.push(s);
      }
      return out;
    }
    return data.skills;
  }, [data.skills, data.skillGroups]);
  const hasSkills = skillsList.length > 0;

  // Custom links
  const linksItems = useMemo(
    () =>
      data.customLinks.map((l) => ({
        id: l.id,
        label: l.label,
        href: l.url,
        description: l.description,
        kind: "link" as const,
      })),
    [data.customLinks],
  );

  // Social links (built-ins + custom)
  const socialsItems = useMemo(() => {
    const out: Array<{ id: string; label: string; href: string; kind: "social" }> = [];
    if (data.socials.linkedin)
      out.push({ id: "linkedin", label: "LinkedIn", href: data.socials.linkedin, kind: "social" });
    if (data.socials.twitter)
      out.push({
        id: "twitter",
        label: "Twitter",
        href: `https://twitter.com/${data.socials.twitter.replace(/^@/, "")}`,
        kind: "social",
      });
    if (data.socials.github)
      out.push({
        id: "github-social",
        label: "GitHub",
        href: `https://github.com/${data.socials.github}`,
        kind: "social",
      });
    if (data.socials.website)
      out.push({ id: "website", label: "Website", href: data.socials.website, kind: "social" });
    if (data.socials.email)
      out.push({ id: "email", label: "Email", href: `mailto:${data.socials.email}`, kind: "social" });
    for (const s of data.customSocials) {
      out.push({
        id: `cs-${s.id ?? s.label}`,
        label: s.label,
        href: s.url,
        kind: "social",
      });
    }
    return out;
  }, [data.socials, data.customSocials]);
  const hasLinksOrSocials = linksItems.length > 0 || socialsItems.length > 0;

  /* Refs to staged elements */
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const identityRef = useRef<HTMLDivElement | null>(null);
  const identityNameRef = useRef<HTMLHeadingElement | null>(null);
  const identityHeadlineRef = useRef<HTMLParagraphElement | null>(null);
  const identityBioRef = useRef<HTMLParagraphElement | null>(null);
  const expCardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const skillsContainerRef = useRef<HTMLDivElement | null>(null);
  const skillTagRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const platformCardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const platformInfoRefs = useRef<Array<HTMLDivElement | null>>([]);
  const featuredRef = useRef<HTMLDivElement | null>(null);
  const projectCardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const filesRef = useRef<HTMLDivElement | null>(null);
  const linksSocialsRef = useRef<HTMLDivElement | null>(null);
  const educationRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  /* GSAP timeline */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return;

    const ctx = gsap.context(() => {
      /* Initial state — only identity visible */
      gsap.set(identityRef.current, { autoAlpha: 1 });
      gsap.set(identityNameRef.current, { autoAlpha: 1, scaleX: 1, scaleY: 1 });
      gsap.set(identityHeadlineRef.current, { autoAlpha: 1, y: 0 });
      gsap.set(identityBioRef.current, { autoAlpha: 1, y: 0 });

      // Experience cards off-stage to the sides
      expCardRefs.current.forEach((card, i) => {
        if (!card) return;
        const side = i % 2 === 0 ? -1 : 1;
        gsap.set(card, {
          xPercent: -50,
          yPercent: -50,
          x: side * 800,
          y: 0,
          autoAlpha: 0,
          scale: 0.85,
        });
      });

      // Skills container + tags off-stage
      if (skillsContainerRef.current) {
        gsap.set(skillsContainerRef.current, {
          xPercent: -50,
          yPercent: -50,
          autoAlpha: 0,
        });
      }
      // Each skill tag starts scattered randomly off-stage
      skillTagRefs.current.forEach((tag, i) => {
        if (!tag) return;
        // Pseudo-random scatter using index hash
        const ang = (i * 137.5) * (Math.PI / 180); // golden angle
        const dist = 400 + ((i * 47) % 200);
        gsap.set(tag, {
          x: Math.cos(ang) * dist,
          y: Math.sin(ang) * dist,
          autoAlpha: 0,
          scale: 0.4,
          rotation: ((i * 23) % 60) - 30,
        });
      });

      // Platform cards above viewport
      platformCardRefs.current.forEach((card, i) => {
        if (!card) return;
        gsap.set(card, {
          xPercent: -50,
          yPercent: -50,
          y: -800,
          autoAlpha: 0,
          rotation: (i % 2 === 0 ? -1 : 1) * 12,
        });
      });

      // Platform info panels off-screen right
      platformInfoRefs.current.forEach((info) => {
        if (!info) return;
        gsap.set(info, {
          xPercent: -50,
          yPercent: -50,
          x: window.innerWidth * 0.5,
          autoAlpha: 0,
          scale: 0.3,
        });
      });

      // Featured project above
      if (featuredRef.current) {
        gsap.set(featuredRef.current, {
          xPercent: -50,
          yPercent: -50,
          y: -window.innerHeight,
          autoAlpha: 0,
          scale: 0.7,
        });
      }

      // Other project cards hidden
      projectCardRefs.current.forEach((card) => {
        if (!card) return;
        gsap.set(card, {
          xPercent: -50,
          yPercent: -50,
          autoAlpha: 0,
          scale: 0.85,
        });
      });

      // Files / links+socials / education / end — start centered (xPercent/yPercent
      // override the CSS left:50% top:50% so they actually sit at viewport center
      // rather than offset by the top-left corner — that was the bug)
      [
        filesRef.current,
        linksSocialsRef.current,
        educationRef.current,
        endRef.current,
      ].forEach((el) => {
        if (!el) return;
        gsap.set(el, {
          xPercent: -50,
          yPercent: -50,
          autoAlpha: 0,
          scale: 0.9,
        });
      });

      /* Master timeline */
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: track,
          start: "top top",
          end: "bottom bottom",
          pin: stage,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self: ScrollTrigger) => setProgress(self.progress),
        },
      });

      // ─── Phase 1: Hold identity ──
      tl.addLabel("hold_identity", 0);
      tl.to({}, { duration: 0.3 });

      // ─── Phase 2: Identity exits ──
      tl.addLabel("identity_out", ">");
      tl.call(() => setCurrentPhase("Stretch"), undefined, "identity_out");
      if (identityNameRef.current) {
        tl.to(
          identityNameRef.current,
          {
            scaleX: 6,
            scaleY: 0.3,
            autoAlpha: 0,
            duration: 0.5,
            ease: "power2.in",
            transformOrigin: "center center",
          },
          "identity_out",
        );
      }
      if (identityHeadlineRef.current) {
        tl.to(
          identityHeadlineRef.current,
          { y: -60, autoAlpha: 0, duration: 0.5, ease: "power2.in" },
          "identity_out",
        );
      }
      if (identityBioRef.current) {
        tl.to(
          identityBioRef.current,
          { y: -120, autoAlpha: 0, duration: 0.5, ease: "power2.in" },
          "identity_out",
        );
      }
      // Also fade the wrapper container itself — otherwise it stays
      // visibility:visible with an empty layout occupying the center of
      // the viewport, and intercepts clicks that should reach project
      // cards in later phases (causes the modal-not-opening bug).
      if (identityRef.current) {
        tl.to(
          identityRef.current,
          { autoAlpha: 0, duration: 0.5, ease: "power2.in" },
          "identity_out",
        );
      }

      // ─── Phase 3: Experience cards fly in ──
      const expCount = data.experience.length;
      if (expCount > 0) {
        tl.addLabel("exp_in", ">");
        tl.call(() => setCurrentPhase("Experience"), undefined, "exp_in");
        const cols = Math.min(2, expCount);
        const rows = Math.ceil(expCount / cols);
        const cellW = 440;
        const cellH = 290;
        expCardRefs.current.forEach((card, i) => {
          if (!card) return;
          const col = i % cols;
          const row = Math.floor(i / cols);
          const targetX = (col - (cols - 1) / 2) * cellW;
          const targetY = (row - (rows - 1) / 2) * cellH;
          tl.to(
            card,
            {
              x: targetX,
              y: targetY,
              autoAlpha: 1,
              scale: 1,
              duration: 0.45,
              ease: "power2.out",
            },
            `exp_in+=${i * 0.06}`,
          );
        });

        // ─── Phase 4: Experience compresses to single point ──
        tl.addLabel("exp_compress", ">+=0.25");
        tl.call(() => setCurrentPhase("Compress"), undefined, "exp_compress");
        expCardRefs.current.forEach((card, i) => {
          if (!card) return;
          tl.to(
            card,
            {
              x: 0,
              y: 0,
              scale: 0,
              autoAlpha: 0,
              rotation: 540,
              duration: 0.45,
              ease: "power3.in",
            },
            `exp_compress+=${i * 0.02}`,
          );
        });
      }

      // ─── Phase 4b: Skills emerge from the implosion point ──
      // Skill tags pop out from center (where experience just compressed
      // to), gather into a clean grid, hold, then scatter outward as
      // platforms arrive.
      if (hasSkills && skillsContainerRef.current) {
        tl.addLabel("skills_in", ">+=0.15");
        tl.call(() => setCurrentPhase("Skills"), undefined, "skills_in");
        tl.to(
          skillsContainerRef.current,
          { autoAlpha: 1, duration: 0.2 },
          "skills_in",
        );
        // Each tag eases from its scattered start into its natural
        // (CSS-laid-out) grid position. Stagger creates a "settling"
        // feel.
        skillTagRefs.current.forEach((tag, i) => {
          if (!tag) return;
          tl.to(
            tag,
            {
              x: 0,
              y: 0,
              autoAlpha: 1,
              scale: 1,
              rotation: 0,
              duration: 0.45,
              ease: "back.out(1.4)",
            },
            `skills_in+=${i * 0.025}`,
          );
        });
        // Hold to let the viewer read
        tl.to({}, { duration: 0.5 }, ">");
        // Scatter exit — tags fly outward in different directions
        tl.addLabel("skills_out", ">");
        skillTagRefs.current.forEach((tag, i) => {
          if (!tag) return;
          const ang = (i * 137.5) * (Math.PI / 180);
          const dist = 700 + ((i * 31) % 200);
          tl.to(
            tag,
            {
              x: Math.cos(ang) * dist,
              y: Math.sin(ang) * dist,
              rotation: ((i * 73) % 360) - 180,
              autoAlpha: 0,
              scale: 0.3,
              duration: 0.4,
              ease: "power2.in",
            },
            `skills_out+=${i * 0.015}`,
          );
        });
        tl.to(
          skillsContainerRef.current,
          { autoAlpha: 0, duration: 0.3 },
          "<+=0.25",
        );
      }

      // ─── Phase 5: Platform cards rain down ──
      if (platforms.length > 0) {
        tl.addLabel("platform_rain", ">+=0.15");
        tl.call(() => setCurrentPhase("Platforms"), undefined, "platform_rain");
        const platformCount = platforms.length;
        const cardW = 240;
        platformCardRefs.current.forEach((card, i) => {
          if (!card) return;
          const targetX = (i - (platformCount - 1) / 2) * cardW;
          tl.to(
            card,
            {
              x: targetX,
              y: 0,
              autoAlpha: 1,
              rotation: 0,
              scale: 1,
              duration: 0.55,
              ease: "back.out(1.3)",
            },
            `platform_rain+=${i * 0.1}`,
          );
        });

        // ─── Phase 6: Sequential zoom — each platform takes a turn ──
        // To avoid the "same move 5 times" repetitiveness, each platform
        // gets a distinct combination of:
        //   - card destination side (left / right / top / bottom)
        //   - card transform (scale + tilt + rotation)
        //   - info panel entry direction + easing
        //   - how OTHER cards react (dim, shrink, fall, scatter)
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        platformCardRefs.current.forEach((card, i) => {
          if (!card) return;
          const info = platformInfoRefs.current[i];
          const phaseLabel = `zoom_${i}`;
          const platformTitle = platforms[i].title;
          tl.addLabel(phaseLabel, ">+=0.4");
          tl.call(
            () => setCurrentPhase(platformTitle),
            undefined,
            phaseLabel,
          );

          // Per-platform choreography variant (cycle 4 patterns)
          const variant = i % 4;
          interface CardMove {
            x: number; y: number; rotation: number; scale: number;
            ease: string;
          }
          interface InfoEntry {
            fromX: number; fromY: number; fromScale: number; fromRot: number;
            toX: number; toY: number; ease: string;
          }
          interface OthersMove {
            opacity: number; scale: number; y?: number; rotation?: number;
          }

          let cardMove: CardMove;
          let infoEntry: InfoEntry;
          let othersMove: OthersMove;

          switch (variant) {
            case 0:
              // Card → LEFT, info from RIGHT (back.out)
              cardMove = { x: -vw * 0.28, y: 0, rotation: 0, scale: 1.25, ease: "power2.inOut" };
              infoEntry = {
                fromX: vw * 0.5, fromY: 0, fromScale: 0.3, fromRot: 0,
                toX: vw * 0.18, toY: 0, ease: "back.out(1.4)",
              };
              othersMove = { opacity: 0.18, scale: 0.85 };
              break;
            case 1:
              // Card → RIGHT (tilted), info from LEFT (elastic)
              cardMove = { x: vw * 0.28, y: 0, rotation: 6, scale: 1.25, ease: "power2.inOut" };
              infoEntry = {
                fromX: -vw * 0.5, fromY: 0, fromScale: 0.3, fromRot: -8,
                toX: -vw * 0.18, toY: 0, ease: "elastic.out(1, 0.6)",
              };
              othersMove = { opacity: 0.15, scale: 0.75, y: 40 };
              break;
            case 2:
              // Card → TOP (smaller), info from BOTTOM (bounce) but rests CENTERED
              cardMove = { x: 0, y: -vh * 0.22, rotation: 0, scale: 1.15, ease: "power3.out" };
              infoEntry = {
                fromX: 0, fromY: vh * 0.5, fromScale: 0.4, fromRot: 0,
                toX: 0, toY: vh * 0.04, ease: "bounce.out",
              };
              othersMove = { opacity: 0.12, scale: 0.7, y: 100 };
              break;
            case 3:
              // Card → CENTER (huge with rotation), info from BOTTOM-RIGHT corner (back)
              cardMove = { x: -vw * 0.22, y: -vh * 0.05, rotation: -8, scale: 1.4, ease: "back.out(1.6)" };
              infoEntry = {
                fromX: vw * 0.45, fromY: vh * 0.3, fromScale: 0.2, fromRot: 12,
                toX: vw * 0.2, toY: 0, ease: "power3.out",
              };
              othersMove = { opacity: 0.1, scale: 0.8, rotation: 8 };
              break;
            default:
              cardMove = { x: -vw * 0.28, y: 0, rotation: 0, scale: 1.25, ease: "power2.inOut" };
              infoEntry = {
                fromX: vw * 0.5, fromY: 0, fromScale: 0.3, fromRot: 0,
                toX: vw * 0.18, toY: 0, ease: "back.out(1.4)",
              };
              othersMove = { opacity: 0.18, scale: 0.85 };
          }

          // Focused card moves
          tl.to(
            card,
            {
              x: cardMove.x,
              y: cardMove.y,
              rotation: cardMove.rotation,
              scale: cardMove.scale,
              duration: 0.45,
              ease: cardMove.ease,
              zIndex: 5,
            },
            phaseLabel,
          );

          // Other platform cards react
          platformCardRefs.current.forEach((other, j) => {
            if (!other || j === i) return;
            tl.to(
              other,
              {
                opacity: othersMove.opacity,
                scale: othersMove.scale,
                y: othersMove.y ?? 0,
                rotation: othersMove.rotation ?? 0,
                duration: 0.45,
              },
              phaseLabel,
            );
          });

          // Info panel zooms in from its variant-specific origin
          if (info) {
            // Enable pointer events so the user can scroll the panel +
            // click handle/repo links. Set BEFORE the entry tween so
            // it's interactive as soon as it starts appearing.
            tl.set(info, { pointerEvents: "auto" }, phaseLabel);
            tl.fromTo(
              info,
              {
                x: infoEntry.fromX,
                y: infoEntry.fromY,
                autoAlpha: 0,
                scale: infoEntry.fromScale,
                rotation: infoEntry.fromRot,
              },
              {
                x: infoEntry.toX,
                y: infoEntry.toY,
                autoAlpha: 1,
                scale: 1,
                rotation: 0,
                duration: 0.55,
                ease: infoEntry.ease,
                zIndex: 10,
              },
              `${phaseLabel}+=0.15`,
            );
          }

          // Hold (no tweens) so user can read
          tl.to({}, { duration: 0.45 }, ">");

          // Info exits the way it came
          if (info) {
            tl.to(
              info,
              {
                x: infoEntry.fromX,
                y: infoEntry.fromY,
                autoAlpha: 0,
                scale: infoEntry.fromScale,
                rotation: infoEntry.fromRot,
                duration: 0.35,
                ease: "power2.in",
                zIndex: 0,
              },
              ">",
            );
            // Disable pointer events AFTER exit completes so the invisible
            // panel doesn't intercept clicks on project cards underneath
            tl.set(info, { pointerEvents: "none" });
          }

          // Focused card returns to formation
          const targetX = (i - (platformCount - 1) / 2) * cardW;
          tl.to(
            card,
            {
              x: targetX,
              y: 0,
              scale: 1,
              rotation: 0,
              duration: 0.4,
              ease: "power2.inOut",
              zIndex: 1,
            },
            "<",
          );

          // Other cards restore
          platformCardRefs.current.forEach((other, j) => {
            if (!other || j === i) return;
            tl.to(
              other,
              { autoAlpha: 1, scale: 1, y: 0, rotation: 0, duration: 0.4 },
              "<",
            );
          });
        });

        // ─── Phase 7: Burst — all platform cards explode outward ──
        tl.addLabel("burst", ">+=0.2");
        tl.call(() => setCurrentPhase("Burst"), undefined, "burst");
        platformCardRefs.current.forEach((card, i) => {
          if (!card) return;
          const angle = (i / Math.max(1, platforms.length)) * Math.PI * 2;
          const dist = 1000;
          tl.to(
            card,
            {
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              rotation: 360 + (i % 2 ? 180 : -180),
              scale: 0.1,
              autoAlpha: 0,
              duration: 0.55,
              ease: "power3.in",
            },
            "burst",
          );
        });
      }

      // ─── Phase 8: Featured project descends slowly ──
      if (featured && featuredRef.current) {
        tl.addLabel("featured_in", ">+=0.15");
        tl.call(() => setCurrentPhase("Featured"), undefined, "featured_in");
        tl.to(
          featuredRef.current,
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            duration: 0.85,
            ease: "power2.out",
          },
          "featured_in",
        );
        // Hold
        tl.to({}, { duration: 0.5 }, ">");
        // Exit (shrink up + fade)
        tl.to(
          featuredRef.current,
          {
            y: -150,
            autoAlpha: 0,
            scale: 0.6,
            duration: 0.45,
            ease: "power2.in",
          },
          ">",
        );
      }

      // ─── Phase 9: Other projects appear as grid ──
      if (otherProjects.length > 0) {
        tl.addLabel("projects_in", ">+=0.1");
        tl.call(() => setCurrentPhase("Projects"), undefined, "projects_in");
        const cols = Math.min(3, otherProjects.length);
        const rows = Math.ceil(otherProjects.length / cols);
        const cellW = 300;
        const cellH = 220;
        projectCardRefs.current.forEach((card, i) => {
          if (!card) return;
          const col = i % cols;
          const row = Math.floor(i / cols);
          const targetX = (col - (cols - 1) / 2) * cellW;
          const targetY = (row - (rows - 1) / 2) * cellH;
          tl.to(
            card,
            {
              x: targetX,
              y: targetY,
              autoAlpha: 1,
              scale: 1,
              duration: 0.4,
              ease: "power2.out",
            },
            `projects_in+=${i * 0.05}`,
          );
        });

        // ─── Phase 10: Sequential project reveals with varied effects ──
        projectCardRefs.current.forEach((card, i) => {
          if (!card) return;
          const col = i % cols;
          const row = Math.floor(i / cols);
          const targetX = (col - (cols - 1) / 2) * cellW;
          const targetY = (row - (rows - 1) / 2) * cellH;
          const label = `proj_${i}`;
          tl.addLabel(label, ">+=0.15");
          tl.call(
            () => setCurrentPhase(`Project ${i + 1}`),
            undefined,
            label,
          );

          // Dim others
          projectCardRefs.current.forEach((other, j) => {
            if (!other || j === i) return;
            tl.to(
              other,
              { opacity: 0.15, scale: 0.85, duration: 0.3 },
              label,
            );
          });

          // Each project gets a UNIQUE reveal (cycle through 6)
          const effect = i % 6;
          switch (effect) {
            case 0:
              // Scale up + center
              tl.to(
                card,
                {
                  x: 0,
                  y: 0,
                  scale: 1.7,
                  duration: 0.5,
                  ease: "power3.out",
                  zIndex: 5,
                },
                label,
              );
              break;
            case 1:
              // Slide in from right + scale
              tl.fromTo(
                card,
                { x: 400, scale: 0.7 },
                {
                  x: 0,
                  y: 0,
                  scale: 1.7,
                  duration: 0.55,
                  ease: "power2.out",
                  zIndex: 5,
                },
                label,
              );
              break;
            case 2:
              // Rotate in + scale
              tl.to(
                card,
                {
                  x: 0,
                  y: 0,
                  scale: 1.7,
                  rotation: 360,
                  duration: 0.6,
                  ease: "power2.out",
                  zIndex: 5,
                },
                label,
              );
              break;
            case 3:
              // Flip in (rotateY)
              tl.fromTo(
                card,
                { rotationY: -180 },
                {
                  x: 0,
                  y: 0,
                  scale: 1.7,
                  rotationY: 0,
                  duration: 0.55,
                  ease: "power2.out",
                  zIndex: 5,
                },
                label,
              );
              break;
            case 4:
              // Drop from above + bounce
              tl.fromTo(
                card,
                { y: -300, scale: 0.7 },
                {
                  x: 0,
                  y: 0,
                  scale: 1.7,
                  duration: 0.6,
                  ease: "bounce.out",
                  zIndex: 5,
                },
                label,
              );
              break;
            case 5:
              // Iris reveal — scale from 0 with rotation
              tl.fromTo(
                card,
                { scale: 0, rotation: -45 },
                {
                  x: 0,
                  y: 0,
                  scale: 1.7,
                  rotation: 0,
                  duration: 0.55,
                  ease: "back.out(1.6)",
                  zIndex: 5,
                },
                label,
              );
              break;
          }

          // Hold
          tl.to({}, { duration: 0.3 }, ">");

          // Return to grid
          tl.to(
            card,
            {
              x: targetX,
              y: targetY,
              scale: 1,
              rotation: 0,
              rotationY: 0,
              duration: 0.4,
              ease: "power2.inOut",
              zIndex: 1,
            },
            ">",
          );

          // Restore others
          projectCardRefs.current.forEach((other, j) => {
            if (!other || j === i) return;
            tl.to(
              other,
              { autoAlpha: 1, scale: 1, duration: 0.35 },
              "<",
            );
          });
        });

        // After all reveals, fade out the project grid
        tl.addLabel("projects_out", ">+=0.2");
        projectCardRefs.current.forEach((card, i) => {
          if (!card) return;
          tl.to(
            card,
            {
              autoAlpha: 0,
              y: -50,
              scale: 0.85,
              duration: 0.4,
              ease: "power2.in",
            },
            `projects_out+=${i * 0.03}`,
          );
        });
      }

      // ─── Phase 11: Files + certifications — slides in from LEFT ──
      if (hasFiles && filesRef.current) {
        tl.addLabel("files_in", ">+=0.15");
        tl.call(() => setCurrentPhase("Files"), undefined, "files_in");
        tl.fromTo(
          filesRef.current,
          { x: -500, autoAlpha: 0, scale: 0.92, rotation: -3 },
          {
            x: 0,
            autoAlpha: 1,
            scale: 1,
            rotation: 0,
            duration: 0.55,
            ease: "back.out(1.3)",
          },
          "files_in",
        );
        tl.to({}, { duration: 0.5 }, ">");
        // Exit to LEFT
        tl.to(
          filesRef.current,
          {
            x: -500,
            autoAlpha: 0,
            scale: 0.92,
            duration: 0.4,
            ease: "power2.in",
          },
          ">",
        );
      }

      // ─── Phase 11b: Links + Socials — slides in from RIGHT ──
      if (hasLinksOrSocials && linksSocialsRef.current) {
        tl.addLabel("links_in", ">+=0.1");
        tl.call(() => setCurrentPhase("Connect"), undefined, "links_in");
        tl.fromTo(
          linksSocialsRef.current,
          { x: 500, autoAlpha: 0, scale: 0.92, rotation: 3 },
          {
            x: 0,
            autoAlpha: 1,
            scale: 1,
            rotation: 0,
            duration: 0.55,
            ease: "back.out(1.3)",
          },
          "links_in",
        );
        tl.to({}, { duration: 0.5 }, ">");
        tl.to(
          linksSocialsRef.current,
          {
            x: 500,
            autoAlpha: 0,
            scale: 0.92,
            duration: 0.4,
            ease: "power2.in",
          },
          ">",
        );
      }

      // ─── Phase 12: Education — rises from BELOW with scale ──
      if (data.education.length > 0 && educationRef.current) {
        tl.addLabel("education_in", ">+=0.1");
        tl.call(() => setCurrentPhase("Education"), undefined, "education_in");
        tl.fromTo(
          educationRef.current,
          { y: 200, autoAlpha: 0, scale: 0.85 },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            duration: 0.6,
            ease: "power3.out",
          },
          "education_in",
        );
        tl.to({}, { duration: 0.5 }, ">");
        // Exit upward
        tl.to(
          educationRef.current,
          {
            y: -150,
            autoAlpha: 0,
            scale: 0.9,
            duration: 0.4,
            ease: "power2.in",
          },
          ">",
        );
      }

      // ─── Phase 13: End — emerges from CENTER, scale from 0 ──
      if (endRef.current) {
        tl.addLabel("end_in", ">+=0.2");
        tl.call(() => setCurrentPhase("End"), undefined, "end_in");
        tl.fromTo(
          endRef.current,
          { scale: 0, autoAlpha: 0, rotation: -20 },
          {
            scale: 1,
            autoAlpha: 1,
            rotation: 0,
            duration: 0.7,
            ease: "back.out(1.5)",
          },
          "end_in",
        );
        tl.to({}, { duration: 0.5 }, ">");
      }
    }, stage);

    return () => ctx.revert();
  }, [data, platforms, featured, otherProjects, hasFiles, filesList, skillsList, hasSkills, linksItems, socialsItems, hasLinksOrSocials]);

  return (
    <div className={styles.root}>
      <div
        ref={trackRef}
        className={styles.track}
        style={{ height: `${TRACK_VH}vh` }}
      >
        <div ref={stageRef} className={styles.stage}>
          {/* Identity */}
          <div ref={identityRef} className={`${styles.stageEl} ${styles.identity}`}>
            <div className={styles.identityKicker}>Cinematic Portfolio</div>
            <h1 ref={identityNameRef} className={styles.identityName}>
              {data.displayName}
            </h1>
            {data.headline && (
              <p ref={identityHeadlineRef} className={styles.identityHeadline}>
                {data.headline}
              </p>
            )}
            {data.bio && (
              <p ref={identityBioRef} className={styles.identityBio}>
                {data.bio.split(/\n\s*\n/)[0]}
              </p>
            )}
          </div>

          {/* Experience cards */}
          {data.experience.map((entry, i) => (
            <div
              key={`exp-${entry.id}`}
              ref={(el) => {
                expCardRefs.current[i] = el;
              }}
              className={styles.expCard}
            >
              <div className={styles.expCardDate}>{entry.dates || "—"}</div>
              <h3 className={styles.expCardRole}>{entry.role}</h3>
              {entry.company && (
                <p className={styles.expCardCompany}>{entry.company}</p>
              )}
              {entry.summary && (
                <p className={styles.expCardSummary}>{entry.summary}</p>
              )}
              {entry.skills && entry.skills.length > 0 && (
                <div className={styles.expCardSkills}>
                  {entry.skills.slice(0, 4).map((s) => (
                    <span key={s} className={styles.expCardSkill}>
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Skills */}
          {hasSkills && (
            <div
              ref={skillsContainerRef}
              className={`${styles.stageEl} ${styles.skillsScene}`}
            >
              <div className={styles.skillsKicker}>Abilities</div>
              <h2 className={styles.skillsTitle}>Tools of the trade</h2>
              <div className={styles.skillsCloud}>
                {skillsList.map((s, i) => (
                  <span
                    key={s}
                    ref={(el) => {
                      skillTagRefs.current[i] = el;
                    }}
                    className={styles.skillsTag}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Platform mini cards */}
          {platforms.map((p, i) => (
            <div
              key={`pcard-${p.key}`}
              ref={(el) => {
                platformCardRefs.current[i] = el;
              }}
              className={styles.platformCard}
            >
              <div className={styles.platformCardIcon}>{p.letter}</div>
              <h3 className={styles.platformCardTitle}>{p.title}</h3>
              <p className={styles.platformCardHandle}>{p.handle}</p>
            </div>
          ))}

          {/* Platform info panels */}
          {platforms.map((p, i) => (
            <div
              key={`pinfo-${p.key}`}
              ref={(el) => {
                platformInfoRefs.current[i] = el;
              }}
              className={styles.platformInfo}
            >
              {p.info}
            </div>
          ))}

          {/* Featured project */}
          {featured && (
            <div
              ref={featuredRef}
              className={styles.featured}
              onClick={() => setOpenProject(featured)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpenProject(featured);
                }
              }}
            >
              <span className={styles.featuredKicker}>Featured Work</span>
              {featured.images?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={deriveUrl(featured.images[0].publicId, {
                    width: 1600,
                    height: 900,
                    crop: "fill",
                  })}
                  alt={featured.images[0].caption || featured.title}
                  className={styles.featuredHero}
                />
              )}
              <div className={styles.featuredBody}>
                <h2 className={styles.featuredTitle}>{featured.title}</h2>
                {featured.description && (
                  <p className={styles.featuredDesc}>{featured.description}</p>
                )}
                {featured.tech && featured.tech.length > 0 && (
                  <div className={styles.featuredMeta}>
                    {featured.tech.slice(0, 5).map((t) => (
                      <span key={t} className={styles.featuredTech}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Other projects */}
          {otherProjects.map((p, i) => (
            <div
              key={`proj-${p.id}`}
              ref={(el) => {
                projectCardRefs.current[i] = el;
              }}
              className={styles.projectCard}
              onClick={() => setOpenProject(p)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpenProject(p);
                }
              }}
            >
              {p.images?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={deriveUrl(p.images[0].publicId, {
                    width: 600,
                    height: 400,
                    crop: "fill",
                  })}
                  alt={p.images[0].caption || p.title}
                  className={styles.projectCardImg}
                  loading="lazy"
                />
              )}
              <div className={styles.projectCardOverlay}>
                <h3 className={styles.projectCardTitle}>{p.title}</h3>
                {p.description && (
                  <p className={styles.projectCardDesc}>{p.description}</p>
                )}
                {p.tech && p.tech.length > 0 && (
                  <div className={styles.projectCardTech}>
                    {p.tech.slice(0, 3).map((t) => (
                      <span key={t} className={styles.projectCardTechItem}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Files */}
          {hasFiles && (
            <div ref={filesRef} className={styles.list}>
              <div className={styles.listKicker}>Documents</div>
              <h2 className={styles.listTitle}>Files &amp; certifications</h2>
              <div className={styles.listItems}>
                {filesList.map((f) => (
                  <a
                    key={f.id}
                    href={f.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.listItem}
                  >
                    <div className={styles.listItemHead}>
                      <span className={styles.listItemLabel}>{f.label}</span>
                      <span className={styles.listItemMeta}>{f.format} ↗</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Links + Socials */}
          {hasLinksOrSocials && (
            <div ref={linksSocialsRef} className={styles.list}>
              <div className={styles.listKicker}>Connect</div>
              <h2 className={styles.listTitle}>Links &amp; socials</h2>
              <div className={styles.linksSocialsGrid}>
                {linksItems.length > 0 && (
                  <div>
                    <div className={styles.miniSectionHead}>Elsewhere</div>
                    <div className={styles.listItems}>
                      {linksItems.map((l) => (
                        <a
                          key={l.id}
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.listItem}
                        >
                          <div className={styles.listItemHead}>
                            <span className={styles.listItemLabel}>{l.label}</span>
                            <span className={styles.listItemMeta}>↗</span>
                          </div>
                          {l.description && (
                            <p className={styles.listItemDesc}>{l.description}</p>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {socialsItems.length > 0 && (
                  <div>
                    <div className={styles.miniSectionHead}>Find me</div>
                    <div className={styles.listItems}>
                      {socialsItems.map((s) => (
                        <a
                          key={s.id}
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.listItem}
                        >
                          <div className={styles.listItemHead}>
                            <span className={styles.listItemLabel}>{s.label}</span>
                            <span className={styles.listItemMeta}>↗</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Education */}
          {data.education.length > 0 && (
            <div ref={educationRef} className={styles.list}>
              <div className={styles.listKicker}>Study</div>
              <h2 className={styles.listTitle}>Education</h2>
              <div>
                {data.education.map((e) => (
                  <div key={e.id} className={styles.eduCard}>
                    <div className={styles.eduDate}>{e.dates || "—"}</div>
                    <h3 className={styles.eduInst}>{e.institution}</h3>
                    {e.degree && <p className={styles.eduDeg}>{e.degree}</p>}
                    {e.description && (
                      <p className={styles.eduDeg} style={{ marginTop: 6 }}>
                        {e.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* End */}
          <div ref={endRef} className={styles.end}>
            <div className={styles.endKicker}>End of reel</div>
            <p className={styles.endText}>
              Thanks for watching, {data.displayName.split(" ")[0]}.
            </p>
            <Link href="/" className={styles.endLink}>
              Made with Pofolio →
            </Link>
          </div>
        </div>
      </div>

      {/* HUD */}
      <div className={styles.hud}>
        <div className={styles.hudL}>
          <span className={styles.hudDot} />
          <span>{data.displayName}</span>
        </div>
        <div className={styles.hudR}>
          <span className={styles.hudPhase}>{currentPhase}</span>
          <span className={styles.hudProgress}>
            <span
              className={styles.hudProgressFill}
              style={{ width: `${progress * 100}%` }}
            />
          </span>
          <span>{Math.round(progress * 100).toString().padStart(2, "0")}</span>
        </div>
      </div>

      <ProjectModal
        project={openProject}
        onClose={() => setOpenProject(null)}
      />
    </div>
  );
}