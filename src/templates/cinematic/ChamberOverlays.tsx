"use client";

import { useMemo, type CSSProperties } from "react";
import type { LayoutData } from "@/components/layouts/types";
import { deriveUrl } from "@/lib/cloudinary-url";
import styles from "./cinematic.module.css";

/*
 * Chamber overlays — HTML content that sits on top of the WebGL canvas.
 *
 * Each chamber is the textual / informational counterpart to a 3D
 * chamber in Scene.tsx. The 3D world provides atmosphere; this provides
 * data. Each chamber has a scroll-progress window [start, end] during
 * which it's visible. Within the window:
 *   - First 15%: fade in + slide up
 *   - Middle 70%: hold (with subtle kinetic motion from scroll velocity)
 *   - Last 15%: fade out + slide up further
 *
 * Slot positions (left/right/center) are tuned to match the 3D content's
 * placement in Scene.tsx, so HTML text appears where the visitor's eye
 * is drawn by the 3D objects.
 */

interface Props {
  data: LayoutData;
  progress: number;
  scrollVelocity: number;
  onOpenProject: (p: LayoutData["projects"][number]) => void;
}

type Slot =
  | "center"
  | "centerTop"
  | "centerBottom"
  | "left"
  | "right";

interface ChamberDef {
  key: string;
  weight: number;
  slot: Slot;
  render: (helpers: {
    onOpenProject: Props["onOpenProject"];
    velocity: number;
  }) => React.ReactNode;
}

/* ─── Window math ────────────────────────────────────────────── */

function chamberVisibility(
  progress: number,
  start: number,
  end: number,
): { opacity: number; y: number } {
  const w = end - start;
  const fade = w * 0.15;
  if (progress < start - fade) return { opacity: 0, y: 24 };
  if (progress > end + fade) return { opacity: 0, y: -24 };
  if (progress < start + fade) {
    const t = (progress - start + fade) / (2 * fade);
    const eased = Math.min(1, Math.max(0, t));
    return { opacity: eased, y: 24 * (1 - eased) };
  }
  if (progress > end - fade) {
    const t = (progress - (end - fade)) / (2 * fade);
    const eased = Math.min(1, Math.max(0, t));
    return { opacity: 1 - eased, y: -24 * eased };
  }
  return { opacity: 1, y: 0 };
}

function slotClass(slot: Slot): string {
  switch (slot) {
    case "center":
      return styles.cCenter;
    case "centerTop":
      return styles.cCenterTop;
    case "centerBottom":
      return styles.cCenterBottom;
    case "left":
      return styles.cLeft;
    case "right":
      return styles.cRight;
  }
}

/* ─── Eyebrow component ──────────────────────────────────────── */

function Eyebrow({ num, label }: { num: string; label: string }) {
  return (
    <div className={styles.eyebrow}>
      <span>
        {num} · {label}
      </span>
      <span className={styles.eyebrowLine} />
    </div>
  );
}

/* ─── Genesis (identity) ─────────────────────────────────────── */

function GenesisCard({
  data,
  velocity,
}: {
  data: LayoutData;
  velocity: number;
}) {
  // Letter-spacing reacts to scroll velocity — opens slightly when scrolling
  const tracking = -0.05 + Math.min(0.04, Math.abs(velocity) * 0.4);
  return (
    <div className={styles.identityCard}>
      <div className={styles.identityKicker}>Cinematic Portfolio</div>
      <h1
        className={styles.identityName}
        style={{ letterSpacing: `${tracking}em` }}
      >
        {data.displayName}
      </h1>
      {data.headline && (
        <p className={styles.identityHeadline}>{data.headline}</p>
      )}
      <span className={styles.identityScrollHint}>Scroll to enter ↓</span>
    </div>
  );
}

/* ─── Story (about) ──────────────────────────────────────────── */

function StoryCard({ data }: { data: LayoutData }) {
  if (!data.bio) return null;
  const paragraphs = data.bio.split(/\n\s*\n/).filter((p) => p.trim());
  return (
    <div className={styles.storyCard}>
      <Eyebrow num="I" label="Story" />
      <h2 className={styles.displayMid}>About.</h2>
      <div className={styles.body} style={{ marginTop: 22 }}>
        {paragraphs.map((p, i) => (
          <p key={i}>{p.trim()}</p>
        ))}
      </div>
    </div>
  );
}

/* ─── Timeline (experience) ──────────────────────────────────── */

function TimelineCard({ data }: { data: LayoutData }) {
  return (
    <div className={styles.timelineCard}>
      <Eyebrow num="II" label="Work" />
      <h2 className={styles.displayMid}>Experience</h2>
      <div className={styles.timelineList}>
        {data.experience.slice(0, 5).map((entry) => (
          <div key={entry.id} className={styles.timelineEntry}>
            <div className={styles.timelineDate}>{entry.dates || "—"}</div>
            <h3 className={styles.timelineRole}>{entry.role}</h3>
            {entry.company && (
              <p className={styles.timelineCompany}>{entry.company}</p>
            )}
            {entry.summary && (
              <p className={styles.timelineSummary}>{entry.summary}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Foundation (education) ─────────────────────────────────── */

function FoundationCard({ data }: { data: LayoutData }) {
  return (
    <div className={styles.foundationCard}>
      <Eyebrow num="III" label="Study" />
      <h2 className={styles.displayMid}>Education</h2>
      <div className={styles.foundationGrid}>
        {data.education.map((entry) => (
          <div key={entry.id} className={styles.foundationEntry}>
            <div className={styles.timelineDate}>{entry.dates || "—"}</div>
            <h3 className={styles.timelineRole}>{entry.institution}</h3>
            {entry.degree && (
              <p className={styles.timelineCompany}>{entry.degree}</p>
            )}
            {entry.description && (
              <p className={styles.timelineSummary}>{entry.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Workshop (skills) ──────────────────────────────────────── */

function WorkshopCard({ data }: { data: LayoutData }) {
  const useGroups = data.skillGroups.length > 0;
  return (
    <div className={styles.workshopCard}>
      <Eyebrow num="IV" label="Toolkit" />
      <h2 className={styles.displayMid}>Skills</h2>
      {useGroups ? (
        data.skillGroups.map((g) => (
          <div key={g.id} className={styles.workshopGroupBlock}>
            <div className={styles.workshopGroupName}>{g.name}</div>
            <div className={styles.workshopCloud}>
              {g.skills.map((s) => (
                <span key={s} className={styles.chip}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className={styles.workshopCloud}>
          {data.skills.map((s) => (
            <span key={s} className={styles.chip}>
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Gallery (projects) ─────────────────────────────────────── */

function GalleryCard({
  data,
  onOpenProject,
}: {
  data: LayoutData;
  onOpenProject: Props["onOpenProject"];
}) {
  const featured = data.projects.slice(0, 5);
  return (
    <div className={styles.galleryCard}>
      <div className={styles.galleryHeader}>
        <Eyebrow num="V" label="Selected work" />
        <h2 className={styles.displayMid}>Projects</h2>
      </div>
      <div className={styles.galleryGrid}>
        {featured.map((p) => {
          const hero = p.images?.[0];
          return (
            <div
              key={p.id}
              className={styles.gItem}
              onClick={() => onOpenProject(p)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenProject(p);
                }
              }}
              role="button"
              tabIndex={0}
            >
              {hero && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={deriveUrl(hero.publicId, {
                    width: 1200,
                    height: 800,
                    crop: "fill",
                  })}
                  alt={hero.caption || p.title}
                  className={styles.gItemImg}
                  loading="lazy"
                />
              )}
              <div className={styles.gItemBody}>
                <div className={styles.gItemKicker}>
                  Project{p.year ? ` · ${p.year}` : ""}
                </div>
                <h3 className={styles.gItemTitle}>{p.title}</h3>
                {p.description && (
                  <p className={styles.gItemDesc}>{p.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.dashStat}>
      <div className={styles.dashStatVal}>{value}</div>
      <div className={styles.dashStatLabel}>{label}</div>
    </div>
  );
}

function Constellation({
  days,
}: {
  days: Array<{ date: string; count: number }>;
}) {
  const maxCount = useMemo(
    () => days.reduce((m, d) => Math.max(m, d.count), 0) || 1,
    [days],
  );
  const step = Math.max(1, Math.floor(days.length / 120));
  const sampled = days.filter((_, i) => i % step === 0);
  return (
    <svg
      className={styles.constellation}
      viewBox="0 0 240 64"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {sampled.map((d, i) => {
        const x = (i / Math.max(1, sampled.length - 1)) * 236 + 2;
        const jitter = ((i * 37) % 13) - 6;
        const y = 32 + jitter * 2;
        const intensity = d.count === 0 ? 0 : d.count / maxCount;
        const r = 0.4 + intensity * 1.7;
        const op = d.count === 0 ? 0.12 : 0.35 + intensity * 0.6;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={r}
            fill={d.count === 0 ? "#4a5270" : "#6dd49a"}
            opacity={op}
          />
        );
      })}
    </svg>
  );
}

function Sparkline({ points }: { points: Array<{ t: number; v: number }> }) {
  const sorted = useMemo(
    () => [...points].sort((a, b) => a.t - b.t),
    [points],
  );
  if (sorted.length < 2) return null;
  const W = 300;
  const H = 64;
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
      className={styles.sparkline}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={areaPath} fill="rgba(159, 176, 255, 0.14)" />
      <path
        d={linePath}
        fill="none"
        stroke="#ff9090"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Code / Solve / Compete (dashboards) ───────────────────── */

function CodeCard({ data }: { data: LayoutData }) {
  const g = data.github?.data;
  return (
    <div className={styles.dashCard}>
      <div className={styles.dashHeader}>
        <div>
          <Eyebrow num="VI" label="Code" />
          <h2 className={styles.displayMid}>GitHub</h2>
        </div>
        {g && (
          <a
            href={`https://github.com/${g.user.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.dashHandle}
          >
            @{g.user.login} ↗
          </a>
        )}
      </div>
      {g && (
        <>
          <div className={styles.dashStats}>
            <Stat
              value={g.user.publicRepos.toLocaleString("en-US")}
              label="Repos"
            />
            <Stat
              value={g.totalStars.toLocaleString("en-US")}
              label="Stars"
            />
            <Stat
              value={g.user.followers.toLocaleString("en-US")}
              label="Followers"
            />
            <Stat
              value={(g.contributions?.total ?? 0).toLocaleString("en-US")}
              label="Contribs/yr"
            />
          </div>
          {g.contributions?.days && g.contributions.days.length > 0 && (
            <div className={styles.dashChart}>
              <div className={styles.dashChartLabel}>
                Contribution constellation · 365d
              </div>
              <Constellation days={g.contributions.days.slice(-365)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SolveCard({ data }: { data: LayoutData }) {
  const l = data.leetcode?.data;
  const TOTAL_EASY = 875;
  const TOTAL_MEDIUM = 1900;
  const TOTAL_HARD = 860;
  return (
    <div className={styles.dashCard}>
      <div className={styles.dashHeader}>
        <div>
          <Eyebrow num="VII" label="Solve" />
          <h2 className={styles.displayMid}>LeetCode</h2>
        </div>
        {l && (
          <a
            href={`https://leetcode.com/u/${l.username}/`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.dashHandle}
          >
            @{l.username} ↗
          </a>
        )}
      </div>
      {l && (
        <>
          <div className={styles.dashStats}>
            <Stat value={String(l.totalSolved)} label="Solved" />
            <Stat
              value={l.ranking !== null ? l.ranking.toLocaleString("en-US") : "—"}
              label="Rank"
            />
            <Stat value={String(l.currentStreak ?? 0)} label="Streak" />
            <Stat
              value={String(l.totalActiveDays ?? 0)}
              label="Active days"
            />
          </div>
          <div className={styles.dashChart}>
            <div className={styles.dashChartLabel}>By difficulty</div>
            <div className={styles.diffBars}>
              <div className={styles.diffBar}>
                <span className={styles.diffBarLabel}>Easy</span>
                <span className={styles.diffBarTrack}>
                  <span
                    className={`${styles.diffBarFill} ${styles.diffBarFillEasy}`}
                    style={{
                      width: `${Math.min(100, (l.easySolved / TOTAL_EASY) * 100)}%`,
                    }}
                  />
                </span>
                <span className={styles.diffBarCount}>{l.easySolved}</span>
              </div>
              <div className={styles.diffBar}>
                <span className={styles.diffBarLabel}>Medium</span>
                <span className={styles.diffBarTrack}>
                  <span
                    className={`${styles.diffBarFill} ${styles.diffBarFillMedium}`}
                    style={{
                      width: `${Math.min(100, (l.mediumSolved / TOTAL_MEDIUM) * 100)}%`,
                    }}
                  />
                </span>
                <span className={styles.diffBarCount}>{l.mediumSolved}</span>
              </div>
              <div className={styles.diffBar}>
                <span className={styles.diffBarLabel}>Hard</span>
                <span className={styles.diffBarTrack}>
                  <span
                    className={`${styles.diffBarFill} ${styles.diffBarFillHard}`}
                    style={{
                      width: `${Math.min(100, (l.hardSolved / TOTAL_HARD) * 100)}%`,
                    }}
                  />
                </span>
                <span className={styles.diffBarCount}>{l.hardSolved}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CompeteCard({ data }: { data: LayoutData }) {
  const c = data.codeforces?.data;
  const activeDays = c
    ? (c.submissionHeatmap ?? []).filter((d) => d.count > 0).length
    : 0;
  return (
    <div className={styles.dashCard}>
      <div className={styles.dashHeader}>
        <div>
          <Eyebrow num="VIII" label="Compete" />
          <h2 className={styles.displayMid}>Codeforces</h2>
        </div>
        {c && (
          <a
            href={`https://codeforces.com/profile/${c.user.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.dashHandle}
          >
            @{c.user.handle} ↗
          </a>
        )}
      </div>
      {c && (
        <>
          <div className={styles.dashStats}>
            <Stat
              value={c.user.rating !== null ? String(c.user.rating) : "—"}
              label="Rating"
            />
            <Stat
              value={
                c.user.maxRating !== null ? String(c.user.maxRating) : "—"
              }
              label="Max rating"
            />
            <Stat
              value={String(c.contestsParticipated ?? 0)}
              label="Contests"
            />
            <Stat value={String(activeDays)} label="Active days" />
          </div>
          {c.ratingHistory && c.ratingHistory.length >= 2 && (
            <div className={styles.dashChart}>
              <div className={styles.dashChartLabel}>Rating over time</div>
              <Sparkline
                points={c.ratingHistory.map((r) => ({
                  t: r.timestamp,
                  v: r.rating,
                }))}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Library (writing) ──────────────────────────────────────── */

function LibraryCard({ data }: { data: LayoutData }) {
  const d = data.devto?.data;
  return (
    <div className={styles.libraryCard}>
      <Eyebrow num="IX" label="Words" />
      <h2 className={styles.displayMid}>Writing</h2>
      {d && d.articles.length > 0 && (
        <div className={styles.libraryList}>
          {d.articles.slice(0, 6).map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.libraryItem}
            >
              <span className={styles.libraryItemTitle}>{a.title}</span>
              <span className={styles.libraryItemMeta}>
                {a.readingTimeMinutes
                  ? `${a.readingTimeMinutes} min`
                  : new Date(a.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Lab (ml) ───────────────────────────────────────────────── */

function LabCard({ data }: { data: LayoutData }) {
  const hf = data.huggingface?.data;
  return (
    <div className={styles.labCard}>
      <Eyebrow num="X" label="ML" />
      <h2 className={styles.displayMid}>Models &amp; datasets</h2>
      {hf && hf.items.length > 0 && (
        <div className={styles.labGrid}>
          {hf.items.slice(0, 9).map((it) => (
            <a
              key={`${it.kind}-${it.id}`}
              href={it.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.labItem}
            >
              <div className={styles.labKind}>{it.kind}</div>
              <h3 className={styles.labName}>{it.name}</h3>
              <div className={styles.labMeta}>
                {it.likes > 0 ? `♥ ${it.likes}` : "—"}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Departure (wrap) ───────────────────────────────────────── */

interface DepItem {
  id: string;
  label: string;
  meta: string;
  href: string;
}

function DepartureCard({ data }: { data: LayoutData }) {
  const links: DepItem[] = data.customLinks.map((l) => ({
    id: `link-${l.id}`,
    label: l.label,
    meta: prettyHost(l.url),
    href: l.url,
  }));

  const files: DepItem[] = [];
  if (data.resumeCloudinaryId) {
    files.push({
      id: "resume",
      label: "Resume",
      meta: "pdf",
      href: deriveUrl(data.resumeCloudinaryId, { resourceType: "raw" }),
    });
  }
  for (const f of data.files) {
    files.push({
      id: f.id,
      label: f.label,
      meta: f.format,
      href: deriveUrl(f.publicId, { resourceType: f.resourceType }),
    });
  }

  const socials: DepItem[] = [];
  if (data.socials.linkedin)
    socials.push({
      id: "linkedin",
      label: "LinkedIn",
      meta: "↗",
      href: data.socials.linkedin,
    });
  if (data.socials.twitter)
    socials.push({
      id: "twitter",
      label: "Twitter",
      meta: "↗",
      href: `https://twitter.com/${data.socials.twitter.replace(/^@/, "")}`,
    });
  if (data.socials.github)
    socials.push({
      id: "gh-s",
      label: "GitHub",
      meta: "↗",
      href: `https://github.com/${data.socials.github}`,
    });
  if (data.socials.website)
    socials.push({
      id: "site",
      label: "Website",
      meta: "↗",
      href: data.socials.website,
    });
  if (data.socials.email)
    socials.push({
      id: "email",
      label: "Email",
      meta: "↗",
      href: `mailto:${data.socials.email}`,
    });
  for (const s of data.customSocials) {
    socials.push({
      id: `cs-${s.id ?? s.label}`,
      label: s.label,
      meta: "↗",
      href: s.url,
    });
  }

  return (
    <div className={styles.departureCard}>
      <div className={styles.departureHeader}>
        <Eyebrow num="XI" label="Connect" />
        <h2 className={styles.displayMid}>Take these with you.</h2>
      </div>
      <div className={styles.departureGrid}>
        <ColumnList title="Links" items={links} />
        <ColumnList title="Documents" items={files} />
        <ColumnList title="Find me" items={socials} />
      </div>
    </div>
  );
}

function ColumnList({
  title,
  items,
}: {
  title: string;
  items: DepItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div className={styles.depCol}>
      <div className={styles.depColTitle}>{title}</div>
      <div className={styles.depColList}>
        {items.map((it) => (
          <a
            key={it.id}
            href={it.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.depColItem}
          >
            <span className={styles.depColItemLabel}>{it.label}</span>
            <span className={styles.depColItemMeta}>{it.meta}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─── Horizon ────────────────────────────────────────────────── */

function HorizonCard({ data }: { data: LayoutData }) {
  return (
    <div className={styles.horizonCard}>
      <div className={styles.horizonKicker}>End of reel</div>
      <p className={styles.horizonText}>
        Thanks for watching, {data.displayName.split(" ")[0]}.
      </p>
      <a href="/" className={styles.horizonLink}>
        Made with Pofolio →
      </a>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

function prettyHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/* ─── Build the chamber list dynamically ─────────────────────── */

function buildChambers(data: LayoutData): ChamberDef[] {
  const out: ChamberDef[] = [];
  out.push({
    key: "genesis",
    weight: 1.0,
    slot: "center",
    render: ({ velocity }) => <GenesisCard data={data} velocity={velocity} />,
  });
  if (data.bio) {
    out.push({
      key: "story",
      weight: 1.1,
      slot: "left",
      render: () => <StoryCard data={data} />,
    });
  }
  if (data.experience.length > 0) {
    out.push({
      key: "timeline",
      weight: 1.2,
      slot: "left",
      render: () => <TimelineCard data={data} />,
    });
  }
  if (data.education.length > 0) {
    out.push({
      key: "foundation",
      weight: 1.0,
      slot: "center",
      render: () => <FoundationCard data={data} />,
    });
  }
  if (data.skills.length > 0 || data.skillGroups.length > 0) {
    out.push({
      key: "workshop",
      weight: 1.1,
      slot: "center",
      render: () => <WorkshopCard data={data} />,
    });
  }
  if (data.projects.length > 0) {
    out.push({
      key: "gallery",
      weight: 1.5,
      slot: "center",
      render: ({ onOpenProject }) => (
        <GalleryCard data={data} onOpenProject={onOpenProject} />
      ),
    });
  }
  if (data.github) {
    out.push({
      key: "code",
      weight: 1.0,
      slot: "right",
      render: () => <CodeCard data={data} />,
    });
  }
  if (data.leetcode) {
    out.push({
      key: "solve",
      weight: 1.0,
      slot: "left",
      render: () => <SolveCard data={data} />,
    });
  }
  if (data.codeforces) {
    out.push({
      key: "compete",
      weight: 1.0,
      slot: "center",
      render: () => <CompeteCard data={data} />,
    });
  }
  if (data.devto) {
    out.push({
      key: "library",
      weight: 0.9,
      slot: "left",
      render: () => <LibraryCard data={data} />,
    });
  }
  if (data.huggingface) {
    out.push({
      key: "lab",
      weight: 1.0,
      slot: "right",
      render: () => <LabCard data={data} />,
    });
  }
  const hasWrap =
    data.customLinks.length > 0 ||
    data.resumeCloudinaryId ||
    data.files.length > 0 ||
    Object.values(data.socials).some(
      (v) => typeof v === "string" && v.length > 0,
    ) ||
    data.customSocials.length > 0;
  if (hasWrap) {
    out.push({
      key: "departure",
      weight: 1.1,
      slot: "center",
      render: () => <DepartureCard data={data} />,
    });
  }
  out.push({
    key: "horizon",
    weight: 0.9,
    slot: "center",
    render: () => <HorizonCard data={data} />,
  });
  return out;
}

/* ─── Main component ─────────────────────────────────────────── */

export function ChamberOverlays({
  data,
  progress,
  scrollVelocity,
  onOpenProject,
}: Props) {
  const chambers = useMemo(() => buildChambers(data), [data]);

  const windows = useMemo(() => {
    const total = chambers.reduce((s, c) => s + c.weight, 0);
    const out: Record<string, [number, number]> = {};
    let cursor = 0;
    for (const c of chambers) {
      const w = c.weight / total;
      out[c.key] = [cursor, cursor + w];
      cursor += w;
    }
    return out;
  }, [chambers]);

  return (
    <>
      {chambers.map((c) => {
        const [start, end] = windows[c.key];
        const { opacity, y } = chamberVisibility(progress, start, end);
        // Compose transform: each chamber's inner card has its own
        // translate(-50%, -50%) for centering; we ADD a Y offset for the
        // entry/exit animation. That requires the chamber to be a
        // POSITION-only wrapper with no transform, and the inner card
        // does the transform. Inline opacity + y offset go on the wrapper.
        const style: CSSProperties = {
          opacity,
          transform: `translateY(${y}px)`,
          visibility: opacity < 0.01 ? "hidden" : "visible",
        };
        const alive = opacity > 0.5 ? styles.cAlive : "";
        return (
          <div
            key={c.key}
            className={`${styles.chamber} ${slotClass(c.slot)} ${alive}`}
            style={style}
          >
            {c.render({ onOpenProject, velocity: scrollVelocity })}
          </div>
        );
      })}
    </>
  );
}

/* ─── Expose buildChambers for the orchestrator to compute presence ─── */
export function getPresence(data: LayoutData) {
  return {
    bio: !!data.bio,
    experience: data.experience.length,
    education: data.education.length,
    skills: data.skills.length > 0 || data.skillGroups.length > 0,
    projects: data.projects.length,
    github: !!data.github,
    leetcode: !!data.leetcode,
    codeforces: !!data.codeforces,
    writing: !!data.devto,
    ml: !!data.huggingface,
    wrap:
      data.customLinks.length > 0 ||
      !!data.resumeCloudinaryId ||
      data.files.length > 0 ||
      Object.values(data.socials).some(
        (v) => typeof v === "string" && v.length > 0,
      ) ||
      data.customSocials.length > 0,
  };
}