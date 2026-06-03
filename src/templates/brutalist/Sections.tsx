"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import type { LayoutData } from "@/components/layouts/types";
import { deriveUrl } from "@/lib/cloudinary-url";
import styles from "./brutalist.module.css";

/*
 * Section primitives + all section content renderers.
 *
 * One file (not separate-per-section) because each renderer is short and
 * they all share the same styling language. Splitting would mean 7+ tiny
 * files. We'd split if these grow past ~50 LOC each.
 *
 * Each renderer takes a slice of LayoutData and outputs a React subtree
 * styled with the scoped brutalist CSS. No shared `<Section>` component
 * from elsewhere — this template owns its own.
 */

/* ─── Section header — block-numbered ──────────────────────────── */

export function SectionHeader({
  number,
  title,
  externalUrl,
  externalLabel,
}: {
  number: string;
  title: string;
  externalUrl?: string;
  externalLabel?: string;
}) {
  return (
    <div className={styles.sectionHeader}>
      <div className={styles.sectionNumber} aria-hidden>
        N°{number}
      </div>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {externalUrl && externalLabel && (
        <a
          className={styles.sectionExt}
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-no-print-url
        >
          {externalLabel} ↗
        </a>
      )}
    </div>
  );
}

/* ─── About ────────────────────────────────────────────────────── */

export function AboutSection({ data }: { data: LayoutData }) {
  if (!data.bio) return null;
  // Two-column grid: lead sentence + remaining body. We split the bio at the
  // first paragraph break — common case, users write a punchy first line.
  const [lead, ...rest] = data.bio.split(/\n\n+/);
  const body = rest.join("\n\n").trim();

  return (
    <div className={styles.aboutGrid}>
      <p className={styles.aboutLead}>{lead}</p>
      {body && <p className={styles.aboutBody}>{body}</p>}
    </div>
  );
}

/* ─── Experience ───────────────────────────────────────────────── */

export function ExperienceSection({ data }: { data: LayoutData }) {
  if (data.experience.length === 0) return null;
  return (
    <ol className={styles.expList}>
      {data.experience.map((e) => (
        <li key={e.id} className={styles.expItem}>
          {e.dates && <span className={styles.expDates}>{e.dates}</span>}
          <div>
            {(e.role || e.company) && (
              <>
                <h3 className={styles.expRole}>{e.role || e.company}</h3>
                {e.role && e.company && (
                  <div className={styles.expCompany}>{e.company}</div>
                )}
              </>
            )}
            {e.summary && <p className={styles.expSummary}>{e.summary}</p>}
            {/* Per-experience skills — what was used in THIS role. Rendered
                inline below the summary as small accented chips. Distinct
                from the global skills list. */}
            {e.skills && e.skills.length > 0 && (
              <ul className={styles.expSkills}>
                {e.skills.map((s) => (
                  <li key={s} className={styles.expSkillChip}>
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <span />
        </li>
      ))}
    </ol>
  );
}

/* ─── Education ────────────────────────────────────────────────── */

export function EducationSection({ data }: { data: LayoutData }) {
  if (data.education.length === 0) return null;
  return (
    <ul className={styles.eduList}>
      {data.education.map((e) => (
        <li key={e.id} className={styles.eduItem}>
          <div className={styles.eduMain}>
            <div className={styles.eduInst}>{e.institution}</div>
            {e.degree && <div className={styles.eduDegree}>{e.degree}</div>}
            {/* Optional description — coursework, GPA, thesis, honors. */}
            {e.description && (
              <p className={styles.eduDescription}>{e.description}</p>
            )}
          </div>
          {e.dates && <span className={styles.eduDates}>{e.dates}</span>}
        </li>
      ))}
    </ul>
  );
}

/* ─── Skills ───────────────────────────────────────────────────── */

export function SkillsSection({ data }: { data: LayoutData }) {
  // Page loader auto-migrates flat skills → a single group named "Skills",
  // so we only need to check skillGroups. The flat .skills array is still
  // available as a backwards-compat path but skillGroups is preferred.
  const groups = data.skillGroups;
  if (groups.length === 0) return null;
  const hasMultipleGroups = groups.length > 1;

  return (
    <div className={styles.skillsWrap}>
      {groups.map((g) => (
        <div key={g.id} className={styles.skillGroup}>
          {/* Only show group name if there are multiple groups — the auto-
              migrated single "Skills" group shouldn't have a redundant
              header above its chips. */}
          {hasMultipleGroups && g.name && (
            <h3 className={styles.skillGroupName}>{g.name}</h3>
          )}
          {g.description && (
            <p className={styles.skillGroupDescription}>{g.description}</p>
          )}
          <ul className={styles.skillList}>
            {g.skills.map((s) => (
              <li key={s} className={styles.skillChip}>
                {s}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ─── Projects ─────────────────────────────────────────────────── */

export function ProjectsSection({ data }: { data: LayoutData }) {
  if (data.projects.length === 0) return null;

  const featured = data.projects.filter((p) => p.featured);
  const rest = data.projects.filter((p) => !p.featured);

  return (
    <div>
      {featured.length > 0 && (
        <div className={styles.projectFeatured}>
          {featured.map((p) => (
            <ProjectCard key={p.id} project={p} large />
          ))}
        </div>
      )}
      {rest.length > 0 && (
        <div className={styles.projectGrid}>
          {rest.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  large = false,
}: {
  project: LayoutData["projects"][number];
  large?: boolean;
}) {
  const hero = project.images?.[0];
  return (
    <article
      className={`${styles.card} ${styles.cardHover} ${styles.projectCard}`}
      data-cursor="hover"
    >
      {hero && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.projectImage}
          src={deriveUrl(hero.publicId, {
            width: large ? 1600 : 800,
            height: large ? 900 : 450,
            crop: "fill",
          })}
          alt={hero.caption ?? project.title}
          loading="lazy"
        />
      )}
      <div className={styles.projectBody}>
        <div className={styles.projectMeta}>
          <span>{[project.role, project.year].filter(Boolean).join(" · ")}</span>
        </div>
        <h3 className={styles.projectTitle}>{project.title}</h3>
        {project.description && (
          <p className={styles.projectDesc}>{project.description}</p>
        )}
        {project.tech && project.tech.length > 0 && (
          <ul className={styles.projectTech}>
            {project.tech.slice(0, 8).map((t) => (
              <li key={t} className={styles.projectTechChip}>
                {t}
              </li>
            ))}
          </ul>
        )}
        {(project.demoUrl || project.sourceUrl || project.videoUrl) && (
          <div className={styles.projectLinks}>
            {project.demoUrl && (
              <a
                className={styles.projectLink}
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Demo ↗
              </a>
            )}
            {project.sourceUrl && (
              <a
                className={styles.projectLink}
                href={project.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Source ↗
              </a>
            )}
            {project.videoUrl && (
              <a
                className={styles.projectLink}
                href={project.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Video ↗
              </a>
            )}
          </div>
        )}
        {/* Additional images beyond the hero — rendered as a tight grid
            below the hero/text. Brutalist aesthetic: 2px borders, no gaps
            larger than 8px. Lazy-loaded so off-screen images don't block
            initial paint. */}
        {project.images && project.images.length > 1 && (
          <div className={styles.projectGalleryAdditional}>
            {project.images.slice(1, 7).map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={deriveUrl(img.publicId, {
                  width: 600,
                  height: 450,
                  crop: "fill",
                })}
                alt={img.caption ?? ""}
                className={styles.projectGalleryImg}
                loading="lazy"
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

/* ─── Integrations: GitHub / LeetCode / Codeforces ─────────────── */

export function GitHubStats({ data }: { data: LayoutData }) {
  const g = data.github?.data;
  if (!g) return null;
  return (
    <StatGrid>
      <Stat
        value={`@${g.user.login}`}
        label="handle"
        accent
        href={`https://github.com/${g.user.login}`}
      />
      <Stat value={String(g.user.publicRepos)} label="repositories" />
      <Stat value={String(g.totalStars)} label="stars" />
      <Stat value={String(g.user.followers)} label="followers" />
    </StatGrid>
  );
}

export function LeetCodeStats({ data }: { data: LayoutData }) {
  const l = data.leetcode?.data;
  if (!l) return null;
  // Approximate problem-pool totals — see same constant in the
  // single-page LeetCodeSection. Not authoritative but matches the ratios
  // visitors see in the canonical view.
  const TOTALS = { easy: 875, medium: 1900, hard: 860 };
  const maxStreak = computeMaxStreak(l.submissionHeatmap);
  return (
    <>
      <StatGrid>
        <Stat
          value={`@${l.username}`}
          label="handle"
          accent
          href={`https://leetcode.com/u/${l.username}/`}
        />
        <Stat value={String(l.totalSolved)} label="solved" />
        <Stat
          value={l.ranking !== null ? l.ranking.toLocaleString("en-US") : "—"}
          label="rank"
        />
        <Stat value={l.country ?? "—"} label="country" />
      </StatGrid>
      {/* Difficulty breakdown — rendered as ratios out of the approximate
          problem pool. Mirrors what single-page LeetCode shows. */}
      <div className={styles.lcRatioRow}>
        <RatioBar
          label="Easy"
          solved={l.easySolved}
          total={TOTALS.easy}
        />
        <RatioBar
          label="Medium"
          solved={l.mediumSolved}
          total={TOTALS.medium}
        />
        <RatioBar
          label="Hard"
          solved={l.hardSolved}
          total={TOTALS.hard}
        />
      </div>
      <StatGrid>
        <Stat value={`${l.currentStreak ?? 0}`} label="current streak" />
        <Stat value={`${maxStreak}`} label="max streak" />
        <Stat
          value={`${l.totalActiveDays ?? 0}`}
          label="active days"
        />
        <Stat
          value={
            l.contestHistory && l.contestHistory.length > 0
              ? String(
                  l.contestHistory[l.contestHistory.length - 1]?.rating ??
                    "—",
                )
              : "—"
          }
          label="contest rating"
        />
      </StatGrid>
    </>
  );
}

export function CodeforcesStats({ data }: { data: LayoutData }) {
  const c = data.codeforces?.data;
  if (!c) return null;
  const totalSubmissions = (c.submissionHeatmap ?? []).reduce(
    (s, d) => s + d.count,
    0,
  );
  const activeDays = (c.submissionHeatmap ?? []).filter((d) => d.count > 0)
    .length;
  const maxStreak = computeMaxStreak(c.submissionHeatmap);
  return (
    <>
      <StatGrid>
        <Stat
          value={`@${c.user.handle}`}
          label="handle"
          accent
          href={`https://codeforces.com/profile/${c.user.handle}`}
        />
        <Stat
          value={c.user.rating !== null ? String(c.user.rating) : "—"}
          label="rating"
        />
        <Stat
          value={c.user.maxRating !== null ? String(c.user.maxRating) : "—"}
          label="max rating"
        />
        <Stat value={c.user.rank ?? "—"} label="rank" />
      </StatGrid>
      <StatGrid>
        <Stat value={String(c.contestsParticipated)} label="contests" />
        <Stat value={String(totalSubmissions)} label="submissions" />
        <Stat value={String(activeDays)} label="active days" />
        <Stat value={String(maxStreak)} label="max streak" />
      </StatGrid>
      {(c.user.country || c.user.organization) && (
        <StatGrid>
          {c.user.country && (
            <Stat value={c.user.country} label="country" />
          )}
          {c.user.organization && (
            <Stat value={c.user.organization} label="organization" />
          )}
        </StatGrid>
      )}
    </>
  );
}

/* Difficulty ratio bar — used in LeetCode for Easy/Medium/Hard breakdowns.
 * Renders as a bordered horizontal bar with a fill proportional to
 * solved/total. The brutalist version uses sharp borders, no rounded
 * corners, and color-codes by difficulty (green/yellow/red is too
 * conventional — we use accent yellow + black + ink-darker tones). */
function RatioBar({
  label,
  solved,
  total,
}: {
  label: string;
  solved: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min(100, (solved / total) * 100) : 0;
  return (
    <div className={styles.ratioBar}>
      <div className={styles.ratioHead}>
        <span className={styles.ratioLabel}>{label}</span>
        <span className={styles.ratioCount}>
          {solved} <span className={styles.ratioTotal}>/ {total}</span>
        </span>
      </div>
      <div className={styles.ratioTrack}>
        <div
          className={styles.ratioFill}
          style={{ width: `${pct}%` }}
          data-difficulty={label.toLowerCase()}
        />
      </div>
    </div>
  );
}

/* Max-streak computation — shared between LeetCode and Codeforces.
 * A streak is a run of consecutive days with count > 0. Returns 0 for
 * empty input. */
function computeMaxStreak(
  heatmap: Array<{ date: string; count: number }> | undefined,
): number {
  if (!heatmap || heatmap.length === 0) return 0;
  const sorted = [...heatmap].sort((a, b) => a.date.localeCompare(b.date));
  let max = 0;
  let cur = 0;
  let prevDate: Date | null = null;
  for (const d of sorted) {
    if (d.count === 0) {
      cur = 0;
      prevDate = null;
      continue;
    }
    const today = new Date(d.date);
    if (prevDate) {
      const diff =
        (today.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000);
      cur = diff === 1 ? cur + 1 : 1;
    } else {
      cur = 1;
    }
    if (cur > max) max = cur;
    prevDate = today;
  }
  return max;
}

function StatGrid({ children }: { children: ReactNode }) {
  return <div className={styles.statGrid}>{children}</div>;
}

function Stat({
  value,
  label,
  accent,
  href,
}: {
  value: string;
  label: string;
  accent?: boolean;
  /** When provided, the entire stat card becomes a link. */
  href?: string;
}) {
  const content = (
    <>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.statCard}
        data-accent={accent ? "true" : "false"}
        data-link="true"
        data-cursor="hover"
      >
        {content}
      </a>
    );
  }
  return (
    <div className={styles.statCard} data-accent={accent ? "true" : "false"}>
      {content}
    </div>
  );
}

/* ─── Contribution heatmap (used by GitHub/LeetCode/Codeforces) ─────
 * Brutalist take on the GitHub-style year grid. Differences from a stock
 * GitHub heatmap:
 *   - 2px black borders around each cell (no gaps, no rounded corners)
 *   - Active cells use the hazard-yellow accent; peak activity goes ink-black
 *   - Year tabs are brutalist-bordered buttons (no rounded corners)
 *   - Always renders a full Jan 1 → Dec 31 grid when year-filtered, so
 *     spacing stays identical across years (future days in the current
 *     year render as blank — they still claim grid space)
 *
 * Calendar bucketing: cells lay out by (week-from-window-start, day-of-week)
 * — same logic the terminal template uses. Without this, sparse data would
 * pack into the leftmost columns instead of spanning months evenly.
 */

function ContributionHeatmap({
  days,
  totalLabel,
  defaultYear,
}: {
  days: Array<{ date: string; count: number }>;
  totalLabel?: string;
  /** Pre-select this year if available. Falls back to most recent year. */
  defaultYear?: number;
}) {
  // Available years across the input data, newest first.
  const availableYears = useMemo(() => {
    return Array.from(
      new Set(days.map((d) => new Date(d.date).getFullYear())),
    ).sort((a, b) => b - a);
  }, [days]);

  // Default to most recent year so the heatmap always renders a single
  // year's grid (consistent spacing across the three sections).
  const [selectedYear, setSelectedYear] = useState<number>(
    defaultYear ?? availableYears[0] ?? new Date().getFullYear(),
  );

  // Filter to selected year.
  const filtered = useMemo(
    () =>
      days.filter((d) => new Date(d.date).getFullYear() === selectedYear),
    [days, selectedYear],
  );

  if (filtered.length === 0) {
    return (
      <div className={styles.heatmapWrap}>
        <div className={styles.heatmapMeta}>
          <span>No activity for {selectedYear}</span>
        </div>
      </div>
    );
  }

  // Bucket activity into 5 levels using the year's max as upper bound
  // (relative scale — a quiet user's "1 commit" still reads as activity).
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

  // Calendar window: always Jan 1 → Dec 31. Future days for the current
  // year render as -1 (blank) so spacing stays identical across years.
  const windowStart = new Date(selectedYear, 0, 1);
  const windowEnd = new Date(selectedYear, 11, 31);
  const renderStart = new Date(windowStart);
  renderStart.setDate(renderStart.getDate() - renderStart.getDay()); // back to Sunday
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays =
    Math.floor((windowEnd.getTime() - renderStart.getTime()) / msPerDay) + 1;
  const totalWeeks = Math.ceil(totalDays / 7);

  // Date → count map, using local-time keys to match the data layer's strings.
  const byDate = new Map(filtered.map((d) => [d.date, d.count]));

  // Build the cell grid: rows[day-of-week][week-index] = level.
  const grid: Array<Array<-1 | 0 | 1 | 2 | 3 | 4>> = Array.from(
    { length: 7 },
    () => new Array<-1 | 0 | 1 | 2 | 3 | 4>(totalWeeks).fill(-1),
  );
  for (let w = 0; w < totalWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(renderStart);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      if (
        cellDate < windowStart ||
        cellDate > windowEnd ||
        cellDate > today
      ) {
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

  // Month labels: for each column, use the month of the first non-blank
  // day in that column (handles year-boundary partial weeks correctly).
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

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const totalCount = filtered.reduce((s, d) => s + d.count, 0);
  const activeDays = filtered.filter((d) => d.count > 0).length;

  return (
    <div className={styles.heatmapWrap}>
      <div className={styles.heatmapMeta}>
        <span>
          {totalLabel ??
            `${totalCount.toLocaleString("en-US")} contributions · ${activeDays} active days`}
        </span>
        <span>less ▢ ▢ ▢ ▢ ▢ more</span>
      </div>

      {/* Year selector tabs. Brutalist treatment: bordered buttons, no
          rounded corners. Active year gets the hazard-yellow accent fill. */}
      {availableYears.length > 1 && (
        <div className={styles.heatmapYears}>
          {availableYears.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setSelectedYear(y)}
              className={styles.heatmapYearBtn}
              data-active={y === selectedYear}
              data-cursor="hover"
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Grid + month labels. CSS Grid template defined inline so we can
          parameterize the column count. The day-label column is fixed-width
          (2.5em); the N week columns each share equal space (1fr min 8px). */}
      <div
        className={styles.heatmapCalendar}
        style={{
          gridTemplateColumns: `2.5em repeat(${totalWeeks}, minmax(8px, 1fr))`,
        }}
      >
        {/* Month-label row (row 1: empty corner + month labels) */}
        <span />
        {monthLabel.map((m, i) => (
          <span key={`m-${i}`} className={styles.heatmapMonth}>
            {m || "\u00A0"}
          </span>
        ))}
        {/* 7 day rows. Each row: day label + N cells. */}
        {grid.map((row, dayIdx) => (
          <Fragment key={`d-${dayIdx}`}>
            <span className={styles.heatmapDay}>{dayLabels[dayIdx]}</span>
            {row.map((level, weekIdx) => (
              <div
                key={`c-${dayIdx}-${weekIdx}`}
                className={styles.heatmapCell}
                data-level={level}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/* ─── Rating chart (used by Codeforces) ────────────────────────────
 * Pure SVG line chart. No Recharts. Renders the rating history as an area
 * fill under a line. Calculates min/max from the data and lays out an
 * 800×180 viewBox — width="100%" makes it stretch responsively.
 */
function RatingChart({
  points,
  label,
}: {
  points: Array<{ t: number; rating: number }>;
  label: string;
}) {
  const { path, area, axisYTop, axisYBot, minR, maxR } = useMemo(() => {
    if (points.length < 2) {
      return { path: "", area: "", axisYTop: 20, axisYBot: 160, minR: 0, maxR: 0 };
    }
    const W = 800;
    const H = 180;
    const padX = 32;
    const padTop = 20;
    const padBot = 24;
    const innerW = W - padX * 2;
    const innerH = H - padTop - padBot;

    const ts = points.map((p) => p.t);
    const rs = points.map((p) => p.rating);
    const tMin = Math.min(...ts);
    const tMax = Math.max(...ts);
    const rMin = Math.min(...rs);
    const rMax = Math.max(...rs);
    const tSpan = tMax - tMin || 1;
    const rSpan = rMax - rMin || 1;

    const xy = points.map((p) => {
      const x = padX + ((p.t - tMin) / tSpan) * innerW;
      const y = padTop + (1 - (p.rating - rMin) / rSpan) * innerH;
      return [x, y] as const;
    });

    const path = xy
      .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
      .join(" ");
    const area = `${path} L${xy[xy.length - 1][0]},${H - padBot} L${xy[0][0]},${H - padBot} Z`;

    return {
      path,
      area,
      axisYTop: padTop,
      axisYBot: H - padBot,
      minR: rMin,
      maxR: rMax,
    };
  }, [points]);

  if (points.length < 2) return null;

  return (
    <div className={styles.chartWrap}>
      <div className={styles.heatmapMeta}>
        <span>{label}</span>
        <span>
          {Math.round(minR)} ↔ {Math.round(maxR)}
        </span>
      </div>
      <svg
        className={styles.chartSvg}
        viewBox="0 0 800 180"
        preserveAspectRatio="none"
      >
        <line
          x1="32"
          x2="768"
          y1={axisYBot}
          y2={axisYBot}
          className={styles.chartAxis}
        />
        <path d={area} className={styles.chartArea} />
        <path d={path} className={styles.chartLine} />
        <text x="32" y={axisYTop - 4} className={styles.chartLabel}>
          {Math.round(maxR)}
        </text>
        <text x="32" y={axisYBot + 14} className={styles.chartLabel}>
          {Math.round(minR)}
        </text>
      </svg>
    </div>
  );
}

/* ─── GitHub / LeetCode / Codeforces enriched section bodies ──────
 * Compose: stat grid + heatmap (+ rating chart for codeforces).
 */

export function GitHubFull({ data }: { data: LayoutData }) {
  const g = data.github?.data;
  if (!g) return null;
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <GitHubStats data={data} />
      {g.languageBreakdown && g.languageBreakdown.length > 0 && (
        <div className={styles.langGrid}>
          {g.languageBreakdown.map((l) => (
            <span key={l.language} className={styles.langChip}>
              <span
                className={styles.langDot}
                style={{ background: languageColor(l.language) }}
                aria-hidden
              />
              {l.language}
              <span className={styles.langCount}>×{l.count}</span>
            </span>
          ))}
        </div>
      )}
      {g.contributions && g.contributions.days.length > 0 && (
        <ContributionHeatmap
          days={g.contributions.days}
          totalLabel={`${g.contributions.total.toLocaleString("en-US")} contributions / year`}
        />
      )}
    </div>
  );
}

export function LeetCodeFull({ data }: { data: LayoutData }) {
  const l = data.leetcode?.data;
  if (!l) return null;
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <LeetCodeStats data={data} />
      {l.submissionHeatmap && l.submissionHeatmap.length > 0 && (
        <ContributionHeatmap days={l.submissionHeatmap} />
      )}
      {l.contestHistory && l.contestHistory.length >= 2 && (
        <RatingChart
          points={l.contestHistory.map((c) => ({
            t: c.timestamp * 1000,
            rating: c.rating,
          }))}
          label="Contest rating"
        />
      )}
    </div>
  );
}

export function CodeforcesFull({ data }: { data: LayoutData }) {
  const c = data.codeforces?.data;
  if (!c) return null;
  const ratingPoints = (c.ratingHistory ?? []).map((r) => ({
    t: r.timestamp * 1000,
    rating: r.rating,
  }));
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <CodeforcesStats data={data} />
      {ratingPoints.length >= 2 && (
        <RatingChart points={ratingPoints} label="Rating history" />
      )}
      {c.submissionHeatmap && c.submissionHeatmap.length > 0 && (
        <ContributionHeatmap days={c.submissionHeatmap} />
      )}
      {c.recentContests && c.recentContests.length > 0 && (
        <div>
          <div
            style={{
              fontFamily: "var(--b-font-mono), monospace",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 10,
            }}
          >
            Recent contests
          </div>
          <div className={styles.recentContests}>
            {c.recentContests.slice(0, 6).map((r) => {
              const delta = r.newRating - r.oldRating;
              const sign = delta >= 0 ? "+" : "";
              return (
                <a
                  key={r.contestId}
                  href={`https://codeforces.com/contest/${r.contestId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.recentContestRow}
                  data-cursor="hover"
                >
                  <span className={styles.recentContestName}>
                    {r.contestName}
                  </span>
                  <span className={styles.recentContestMeta}>
                    rank {r.rank.toLocaleString("en-US")} ·{" "}
                    <span
                      className={
                        delta >= 0
                          ? styles.recentContestPositive
                          : styles.recentContestNegative
                      }
                    >
                      {sign}
                      {delta}
                    </span>{" "}
                    ·{" "}
                    {new Date(r.timestamp * 1000).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* GitHub-style language color dot. A small subset of GitHub's linguist
 * palette. Inlined in this template (rather than imported from a shared
 * module) to keep the brutalist template fully self-contained. */
function languageColor(lang: string): string {
  const map: Record<string, string> = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    Python: "#3572A5",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#888888",
    "C#": "#178600",
    Go: "#00ADD8",
    Rust: "#dea584",
    Ruby: "#701516",
    PHP: "#4F5D95",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    Dart: "#00B4AB",
    HTML: "#e34c26",
    CSS: "#563d7c",
    SCSS: "#c6538c",
    Shell: "#89e051",
    Vue: "#41b883",
    Svelte: "#ff3e00",
    Lua: "#5b8aa7",
    R: "#198CE7",
    Scala: "#c22d40",
    Haskell: "#5e5086",
    Elixir: "#6e4a7e",
    Jupyter: "#DA5B0B",
  };
  return map[lang] ?? "#888";
}

/* ─── Dev.to writing list ──────────────────────────────────────── */

export function WritingSection({ data }: { data: LayoutData }) {
  const d = data.devto?.data;
  if (!d || d.articles.length === 0) return null;
  return (
    <ul className={styles.articleList}>
      {d.articles.slice(0, 8).map((a) => (
        <li key={a.id}>
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.articleItem}
            style={{ display: "block", textDecoration: "none", color: "inherit" }}
          >
            <h3 className={styles.articleTitle}>{a.title}</h3>
            <div className={styles.articleMeta}>
              {new Date(a.publishedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {a.readingTimeMinutes ? ` · ${a.readingTimeMinutes} min read` : ""}
              {a.tags && a.tags.length > 0
                ? ` · ${a.tags.slice(0, 3).join(", ")}`
                : ""}
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

/* ─── Hugging Face ML works ────────────────────────────────────── */

export function MLSection({ data }: { data: LayoutData }) {
  const hf = data.huggingface?.data;
  if (!hf || hf.items.length === 0) return null;
  return (
    <div className={styles.hfGrid}>
      {hf.items.slice(0, 10).map((it) => (
        <a
          key={`${it.kind}-${it.id}`}
          href={it.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.hfItem}
        >
          <div className={styles.hfKind}>{it.kind}</div>
          <div className={styles.hfName}>{it.name}</div>
          {it.pipelineTag && <div className={styles.hfTag}>{it.pipelineTag}</div>}
        </a>
      ))}
    </div>
  );
}

/* ─── Custom links section ────────────────────────────────────── */

export function LinksSection({ data }: { data: LayoutData }) {
  if (data.customLinks.length === 0) return null;
  return (
    <div className={styles.linkGrid}>
      {data.customLinks.map((l) => {
        let host = l.url;
        try {
          host = new URL(l.url).host.replace(/^www\./, "");
        } catch {
          /* ignore — l.url may not be a full URL */
        }
        return (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkItem}
          >
            <span className={styles.linkLabel}>{l.label}</span>
            {l.description && (
              <span className={styles.linkDescription}>{l.description}</span>
            )}
            <span className={styles.linkHost}>{host} ↗</span>
          </a>
        );
      })}
    </div>
  );
}

/* ─── Files (resume + uploads) with inline PDF/image/video preview ─── */

export function FilesSection({ data }: { data: LayoutData }) {
  const items: Array<{
    id: string;
    label: string;
    publicId: string;
    resourceType: "image" | "video" | "raw";
    format: string;
    description?: string;
  }> = [];
  if (data.resumeCloudinaryId) {
    items.push({
      id: "resume",
      label: "Resume",
      publicId: data.resumeCloudinaryId,
      resourceType: "raw",
      format: "pdf",
    });
  }
  for (const f of data.files) {
    items.push({
      id: f.id,
      label: f.label,
      publicId: f.publicId,
      resourceType: f.resourceType,
      format: f.format,
      description: f.description,
    });
  }
  if (items.length === 0) return null;
  return (
    <ul className={styles.fileList}>
      {items.map((f) => (
        <FileBlock
          key={f.id}
          label={f.label}
          publicId={f.publicId}
          resourceType={f.resourceType}
          format={f.format}
          description={f.description}
        />
      ))}
    </ul>
  );
}

function FileBlock({
  label,
  publicId,
  resourceType,
  format,
  description,
}: {
  label: string;
  publicId: string;
  resourceType: "image" | "video" | "raw";
  format: string;
  description?: string;
}) {
  const url = deriveUrl(publicId, { resourceType });
  const fmtLower = format.toLowerCase();
  const isPdf = resourceType === "raw" && fmtLower === "pdf";
  const isImage = resourceType === "image";
  const isVideo = resourceType === "video";
  return (
    <li className={styles.fileBlock}>
      <div className={styles.fileHead}>
        <span className={styles.fileKind}>{format || "file"}</span>
        <span className={styles.fileName}>{label}</span>
        <a
          className={styles.fileOpen}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open ↗
        </a>
      </div>
      {description && (
        <p className={styles.fileDescription}>{description}</p>
      )}
      {isPdf && (
        <object
          data={url}
          type="application/pdf"
          className={styles.fileBody}
          aria-label={label}
        >
          <p style={{ padding: 16 }}>
            Your browser can&apos;t preview this PDF.{" "}
            <a href={url} target="_blank" rel="noopener noreferrer">
              Open in new tab
            </a>
          </p>
        </object>
      )}
      {isImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={deriveUrl(publicId, { width: 1600 })}
          alt={label}
          className={styles.fileBodyImage}
          loading="lazy"
        />
      )}
      {isVideo && (
        <video src={url} controls className={styles.fileBody} preload="metadata" />
      )}
    </li>
  );
}

/* ─── Socials strip (rendered in hero area) ───────────────────── */

export function SocialsStrip({ data }: { data: LayoutData }) {
  const entries: Array<{ label: string; href: string }> = [];
  if (data.socials.linkedin)
    entries.push({ label: "LinkedIn", href: data.socials.linkedin });
  if (data.socials.twitter)
    entries.push({
      label: "Twitter",
      href: `https://twitter.com/${data.socials.twitter.replace(/^@/, "")}`,
    });
  if (data.socials.website)
    entries.push({ label: "Website", href: data.socials.website });
  if (data.socials.email)
    entries.push({ label: "Email", href: `mailto:${data.socials.email}` });
  if (data.socials.github)
    entries.push({
      label: "GitHub",
      href: `https://github.com/${data.socials.github}`,
    });
  // User-defined social platforms (Mastodon, Bluesky, ORCID, Polywork, ...).
  // Appended after the fixed five, same visual treatment.
  for (const s of data.customSocials) {
    entries.push({ label: s.label, href: s.url });
  }
  if (entries.length === 0) return null;
  return (
    <div className={styles.socialsStrip}>
      {entries.map((e, i) => (
        <a
          key={`${e.label}-${i}`}
          href={e.href}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.socialsItem}
        >
          {e.label} ↗
        </a>
      ))}
    </div>
  );
}