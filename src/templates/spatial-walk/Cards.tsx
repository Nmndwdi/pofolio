"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { LayoutData } from "@/components/layouts/types";
import { deriveUrl } from "@/lib/cloudinary-url";
import styles from "./spatial-walk.module.css";

/*
 * Spatial-walk cards — Solo Leveling status windows.
 *
 * Each card sits in screen-space over the daylight WebGL landscape. Cards
 * have:
 *   - A "[STATUS WINDOW]" header bar at top with system label + index
 *   - Sharp corners (no border-radius) with 4 corner L-brackets
 *     (drawn via background-gradients in CSS)
 *   - Bright violet/blue border glow
 *   - Monospaced "system" text mixed with light grotesk for content
 *
 * Each card has a scroll-progress window [start, end] and fades in/out
 * within that range. Same fade math as before — but the visual feel is
 * very different.
 *
 * Data parity: we now surface ALL integration data fields:
 *   - GitHub: user.login, publicRepos, totalStars, followers, contributions,
 *     topRepos (with stars), languageBreakdown
 *   - LeetCode: username, realName, country, totalSolved, ranking,
 *     currentStreak, totalActiveDays, easy/medium/hard
 *   - Codeforces: handle, country, org, rating, maxRating, rank, maxRank,
 *     contests, active days, ratingHistory sparkline, recentContests
 *   - Dev.to, HF: full lists
 */

interface Props {
  data: LayoutData;
  progress: number;
  onOpenProject: (p: LayoutData["projects"][number]) => void;
}

type Slot = "center" | "centerTop" | "centerBottom" | "left" | "right";

interface RenderHelpers {
  onOpenProject: Props["onOpenProject"];
  /** Currently-selected year for this card's platform group (or undefined) */
  year: string;
  /** Update the year for this card's platform group */
  setYear: (y: string) => void;
}

interface CardDef {
  key: string;
  weight: number;
  slot: Slot;
  sysLabel: string;
  render: (helpers: RenderHelpers) => React.ReactNode;
  variant?: string;
  /**
   * If set, this card shares a scroll window with another card. The two
   * appear simultaneously side-by-side (or stacked on mobile). The primary
   * card carries the `weight`; the paired secondary has weight=0 and is
   * positioned in `slot` independently.
   */
  pairedWith?: string;
  /** Key of the platform whose year filter state this card shares. */
  yearGroup?: string;
}

/* ─── Visibility math ────────────────────────────────────────── */
function cardVisibility(
  progress: number,
  start: number,
  end: number,
): { opacity: number; y: number } {
  const width = end - start;
  const fade = width * 0.18;
  if (progress < start - fade * 0.5) return { opacity: 0, y: 20 };
  if (progress > end + fade * 0.5) return { opacity: 0, y: -20 };
  if (progress < start + fade) {
    const t = (progress - start + fade * 0.5) / (fade * 1.5);
    const eased = Math.min(1, Math.max(0, t));
    return { opacity: eased, y: 20 * (1 - eased) };
  }
  if (progress > end - fade) {
    const t = (progress - (end - fade)) / (fade * 1.5);
    const eased = Math.min(1, Math.max(0, t));
    return { opacity: 1 - eased, y: -20 * eased };
  }
  return { opacity: 1, y: 0 };
}

function slotClass(slot: Slot): string {
  switch (slot) {
    case "center": return styles.cardCenter;
    case "centerTop": return styles.cardCenterTop;
    case "centerBottom": return styles.cardBottomBand;
    case "left": return styles.cardLeft;
    case "right": return styles.cardRight;
  }
}

function slotTransform(slot: Slot, y: number): string {
  switch (slot) {
    case "center":
    case "centerBottom":
      return `translate(-50%, calc(-50% + ${y}px))`;
    case "centerTop":
      return `translate(-50%, ${y}px)`;
    case "left":
    case "right":
      return `translate(0, calc(-50% + ${y}px))`;
  }
}

/* ─── Status bar header ──────────────────────────────────────── */
function SysBar({
  label,
  index,
  total,
}: {
  label: string;
  index: number;
  total: number;
}) {
  return (
    <div className={styles.cardSysBar}>
      <span className={styles.cardSysBarLeft}>{label}</span>
      <span className={styles.cardSysBarRight}>
        {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
    </div>
  );
}

/* ─── Identity (PLAYER INFO) ─────────────────────────────────── */

function IdentityCard({ data }: { data: LayoutData }) {
  return (
    <div className={styles.cardIdentity}>
      <div className={styles.identityKicker}>[ PORTFOLIO · STATUS WINDOW ]</div>
      <h1 className={styles.identityName}>{data.displayName}</h1>
      {data.headline && (
        <p className={styles.identityHeadline}>{data.headline}</p>
      )}
      <span className={styles.identityMeta}>
        <span className={styles.identityDot} />
        Active · Scroll to enter
      </span>
    </div>
  );
}

/* ─── About ──────────────────────────────────────────────────── */

function AboutCard({ data }: { data: LayoutData }) {
  if (!data.bio) return null;
  const paragraphs = data.bio.split(/\n\s*\n/).filter((p) => p.trim());
  return (
    <>
      <div className={styles.kicker}>Biography</div>
      <h2 className={styles.title}>The lead story</h2>
      <div className={styles.body}>
        {paragraphs.map((p, i) => (
          <p key={i}>{p.trim()}</p>
        ))}
      </div>
    </>
  );
}

/* ─── Experience marker ──────────────────────────────────────── */

function ExperienceCard({
  entry,
}: {
  entry: LayoutData["experience"][number];
}) {
  return (
    <>
      <div className={styles.markerDate}>{entry.dates || "—"}</div>
      <h3 className={styles.markerHead}>{entry.role}</h3>
      {entry.company && (
        <p className={styles.markerSub}>{entry.company}</p>
      )}
      {entry.summary && (
        <p className={styles.markerBody}>{entry.summary}</p>
      )}
      {entry.skills && entry.skills.length > 0 && (
        <div className={styles.markerSkills}>
          {entry.skills.map((s) => (
            <span key={s} className={styles.markerSkill}>{s}</span>
          ))}
        </div>
      )}
    </>
  );
}

/* ─── Education marker ───────────────────────────────────────── */

function EducationCard({
  entry,
}: {
  entry: LayoutData["education"][number];
}) {
  return (
    <>
      <div className={styles.markerDate}>{entry.dates || "—"}</div>
      <h3 className={styles.markerHead}>{entry.institution}</h3>
      {entry.degree && <p className={styles.markerSub}>{entry.degree}</p>}
      {entry.description && (
        <p className={styles.markerBody}>{entry.description}</p>
      )}
    </>
  );
}

/* ─── Skills ─────────────────────────────────────────────────── */

function SkillsCard({ data }: { data: LayoutData }) {
  const useGroups = data.skillGroups.length > 0;
  return (
    <>
      <div className={styles.kicker}>Abilities</div>
      <h2 className={styles.title}>Tools of the trade</h2>
      {useGroups ? (
        data.skillGroups.map((g) => (
          <div key={g.id} className={styles.skillGroup}>
            <div className={styles.skillGroupName}>{g.name}</div>
            {g.description && (
              <p className={styles.skillGroupDesc}>{g.description}</p>
            )}
            <div className={styles.skillsList}>
              {g.skills.map((s) => (
                <span key={s} className={styles.skillsListItem}>{s}</span>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className={styles.skillsList}>
          {data.skills.map((s) => (
            <span key={s} className={styles.skillsListItem}>{s}</span>
          ))}
        </div>
      )}
    </>
  );
}

/* ─── Project card ───────────────────────────────────────────── */

function ProjectCard({
  project,
  onOpen,
  sysBar,
}: {
  project: LayoutData["projects"][number];
  onOpen: () => void;
  sysBar: React.ReactNode;
}) {
  const hero = project.images?.[0];
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      {sysBar}
      {hero && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={deriveUrl(hero.publicId, {
            width: 1200,
            height: 675,
            crop: "fill",
          })}
          alt={hero.caption || project.title}
          className={styles.projectHero}
          loading="lazy"
        />
      )}
      <div className={styles.projectBody}>
        <div className={styles.kicker}>
          Quest{project.year ? ` · ${project.year}` : ""}
        </div>
        <h3 className={styles.projectTitle}>{project.title}</h3>
        {project.description && (
          <p className={styles.projectDesc}>{project.description}</p>
        )}
        {project.tech && project.tech.length > 0 && (
          <div className={styles.projectMeta}>
            {project.tech.slice(0, 4).map((t) => (
              <span key={t} className={styles.projectTech}>{t}</span>
            ))}
          </div>
        )}
        <div className={styles.projectOpenHint}>Enter quest ↗</div>
      </div>
    </div>
  );
}

/* ─── GitHub ──────────────────────────────────────────────────
 *
 * Two sections (rendered in two paired cards side-by-side):
 *   - "primary":   handle, real name, 4 main stats, top languages
 *   - "secondary": top repos list + activity heatmap with year filter
 */
function GitHubCard({
  data,
  section,
  year,
  setYear,
}: {
  data: LayoutData;
  section: "primary" | "secondary";
  year: string;
  setYear: (y: string) => void;
}) {
  const g = data.github?.data;
  if (!g) return null;
  const topLangs = (g.languageBreakdown ?? []).slice(0, 5);
  const langTotal = topLangs.reduce((s, l) => s + l.count, 0) || 1;
  const heatmapDays = g.contributions?.days ?? [];

  if (section === "primary") {
    return (
      <>
        <div className={styles.kicker}>Guild · GitHub</div>
        <h2 className={styles.title}>Code</h2>
        <div className={styles.cardStatsScroll}>
          <div className={styles.statRow}>
            <a
              href={`https://github.com/${g.user.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.statHandle}
            >
              @{g.user.login} ↗
            </a>
            {g.user.name && (
              <span className={styles.statRealName}>{g.user.name}</span>
            )}
          </div>
          <div className={styles.statGrid}>
            <Stat
              value={g.user.publicRepos.toLocaleString("en-US")}
              label="Repos"
            />
            <Stat value={g.totalStars.toLocaleString("en-US")} label="Stars" />
            <Stat
              value={g.user.followers.toLocaleString("en-US")}
              label="Followers"
            />
            <Stat
              value={(g.contributions?.total ?? 0).toLocaleString("en-US")}
              label="Year contribs"
            />
          </div>
          {topLangs.length > 0 && (
            <div className={styles.miniSection}>
              <div className={styles.miniSectionHead}>Top languages</div>
              <div className={styles.languageBars}>
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
        </div>
      </>
    );
  }

  // secondary
  return (
    <>
      <div className={styles.kicker}>Guild · GitHub</div>
      <h2 className={styles.title}>Activity</h2>
      <div className={styles.cardStatsScroll}>
        {heatmapDays.length > 0 && (
          <>
            <YearTabs
              years={getAvailableYears(heatmapDays)}
              active={year}
              onChange={setYear}
            />
            <ActivityHeatmap
              days={heatmapDays}
              year={year}
              title="Contributions"
            />
          </>
        )}
        {g.topRepos && g.topRepos.length > 0 && (
          <div className={styles.miniSection}>
            <div className={styles.miniSectionHead}>Top repos</div>
            <div className={styles.topReposList}>
              {g.topRepos.slice(0, 5).map((r) => (
                <a
                  key={r.fullName}
                  href={r.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.topRepoItem}
                >
                  <span className={styles.topRepoName}>{r.name}</span>
                  <span className={styles.topRepoStars}>
                    ★ {r.stars.toLocaleString("en-US")}
                    {r.language ? ` · ${r.language}` : ""}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── LeetCode ────────────────────────────────────────────────
 *
 *   - "primary":   handle, realName, country, 4 main stats, difficulty bars
 *   - "secondary": 4 secondary stats, contest rating sparkline, heatmap
 */
function LeetCodeCard({
  data,
  section,
  year,
  setYear,
}: {
  data: LayoutData;
  section: "primary" | "secondary";
  year: string;
  setYear: (y: string) => void;
}) {
  const l = data.leetcode?.data;
  if (!l) return null;
  const TOTAL_EASY = 875;
  const TOTAL_MEDIUM = 1900;
  const TOTAL_HARD = 860;
  const easy = l.easySolved ?? 0;
  const medium = l.mediumSolved ?? 0;
  const hard = l.hardSolved ?? 0;
  const maxStreak = computeMaxStreak(l.submissionHeatmap ?? []);
  const heatmapDays = l.submissionHeatmap ?? [];

  if (section === "primary") {
    return (
      <>
        <div className={styles.kicker}>Guild · LeetCode</div>
        <h2 className={styles.title}>Problem solving</h2>
        <div className={styles.cardStatsScroll}>
          <div className={styles.statRow}>
            <a
              href={`https://leetcode.com/u/${l.username}/`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.statHandle}
            >
              @{l.username} ↗
            </a>
            {l.realName && (
              <span className={styles.statRealName}>{l.realName}</span>
            )}
            {l.country && (
              <span className={styles.statCountry}>· {l.country}</span>
            )}
          </div>
          <div className={styles.statGrid}>
            <Stat value={String(l.totalSolved)} label="Solved" />
            <Stat
              value={
                l.ranking !== null ? l.ranking.toLocaleString("en-US") : "—"
              }
              label="Global rank"
            />
            <Stat value={String(l.currentStreak ?? 0)} label="Curr streak" />
            <Stat value={String(maxStreak)} label="Max streak" />
          </div>
          <div className={styles.diffBars}>
            <DiffBar label="Easy" count={easy} total={TOTAL_EASY} kind="easy" />
            <DiffBar
              label="Medium"
              count={medium}
              total={TOTAL_MEDIUM}
              kind="medium"
            />
            <DiffBar label="Hard" count={hard} total={TOTAL_HARD} kind="hard" />
          </div>
        </div>
      </>
    );
  }

  // secondary
  return (
    <>
      <div className={styles.kicker}>Guild · LeetCode</div>
      <h2 className={styles.title}>Activity</h2>
      <div className={styles.cardStatsScroll}>
        <div className={styles.statGrid}>
          <Stat
            value={String(l.totalActiveDays ?? 0)}
            label="Active days"
          />
          <Stat
            value={String(l.contestHistory?.length ?? 0)}
            label="Contests"
          />
          <Stat
            value={
              l.contestHistory?.length
                ? String(Math.max(...l.contestHistory.map((c) => c.rating)))
                : "—"
            }
            label="Peak rating"
          />
          <Stat
            value={(heatmapDays.reduce((s, d) => s + d.count, 0)).toString()}
            label="Submissions"
          />
        </div>
        {l.contestHistory && l.contestHistory.length >= 2 && (
          <div className={styles.miniSection}>
            <div className={styles.miniSectionHead}>Contest rating</div>
            <Sparkline
              points={l.contestHistory.map((c) => ({
                t: c.timestamp,
                v: c.rating,
              }))}
              stroke="#a698ff"
            />
          </div>
        )}
        {heatmapDays.length > 0 && (
          <>
            <YearTabs
              years={getAvailableYears(heatmapDays)}
              active={year}
              onChange={setYear}
            />
            <ActivityHeatmap
              days={heatmapDays}
              year={year}
              title="Submissions"
            />
          </>
        )}
      </div>
    </>
  );
}

/* ─── Codeforces ──────────────────────────────────────────────
 *
 *   - "primary":   handle, rank, country/org, 4 main stats, rating sparkline
 *   - "secondary": 4 secondary stats, recent contests, heatmap
 */
function CodeforcesCard({
  data,
  section,
  year,
  setYear,
}: {
  data: LayoutData;
  section: "primary" | "secondary";
  year: string;
  setYear: (y: string) => void;
}) {
  const c = data.codeforces?.data;
  if (!c) return null;
  const heatmapDays = c.submissionHeatmap ?? [];
  const activeDays = heatmapDays.filter((d) => d.count > 0).length;
  const maxStreak = computeMaxStreak(heatmapDays);

  if (section === "primary") {
    return (
      <>
        <div className={styles.kicker}>Guild · Codeforces</div>
        <h2 className={styles.title}>Competitive</h2>
        <div className={styles.cardStatsScroll}>
          <div className={styles.statRow}>
            <a
              href={`https://codeforces.com/profile/${c.user.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.statHandle}
            >
              @{c.user.handle} ↗
            </a>
            {c.user.rank && (
              <span
                className={styles.statRealName}
                style={{ textTransform: "capitalize" }}
              >
                {c.user.rank}
              </span>
            )}
            {(c.user.country || c.user.organization) && (
              <span className={styles.statCountry}>
                ·{" "}
                {[c.user.organization, c.user.country].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
          <div className={styles.statGrid}>
            <Stat
              value={c.user.rating !== null ? String(c.user.rating) : "—"}
              label="Rating"
            />
            <Stat
              value={c.user.maxRating !== null ? String(c.user.maxRating) : "—"}
              label="Max rating"
            />
            <Stat
              value={String(c.contestsParticipated ?? 0)}
              label="Contests"
            />
            <Stat value={String(activeDays)} label="Active days" />
          </div>
          {c.ratingHistory && c.ratingHistory.length >= 2 && (
            <div className={styles.miniSection}>
              <div className={styles.miniSectionHead}>Rating history</div>
              <Sparkline
                points={c.ratingHistory.map((r) => ({
                  t: r.timestamp,
                  v: r.rating,
                }))}
                stroke="#ffb86b"
              />
            </div>
          )}
        </div>
      </>
    );
  }

  // secondary
  return (
    <>
      <div className={styles.kicker}>Guild · Codeforces</div>
      <h2 className={styles.title}>Activity</h2>
      <div className={styles.cardStatsScroll}>
        <div className={styles.statGrid}>
          <Stat value={c.user.maxRank ? c.user.maxRank : "—"} label="Max rank" />
          <Stat value={String(maxStreak)} label="Max streak" />
          <Stat value={String(c.user.contribution ?? 0)} label="Karma" />
          <Stat
            value={String(heatmapDays.reduce((s, d) => s + d.count, 0))}
            label="Submissions"
          />
        </div>
        {c.recentContests && c.recentContests.length > 0 && (
          <div className={styles.miniSection}>
            <div className={styles.miniSectionHead}>Recent contests</div>
            <div className={styles.contestsList}>
              {c.recentContests.slice(0, 5).map((rc) => {
                const delta = rc.newRating - rc.oldRating;
                return (
                  <div key={rc.contestId} className={styles.contestItem}>
                    <span className={styles.contestName}>{rc.contestName}</span>
                    <span className={styles.contestRank}>#{rc.rank}</span>
                    <span
                      className={`${styles.contestDelta} ${
                        delta >= 0 ? styles.deltaPos : styles.deltaNeg
                      }`}
                    >
                      {delta >= 0 ? `+${delta}` : delta}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {heatmapDays.length > 0 && (
          <>
            <YearTabs
              years={getAvailableYears(heatmapDays)}
              active={year}
              onChange={setYear}
            />
            <ActivityHeatmap
              days={heatmapDays}
              year={year}
              title="Submissions"
            />
          </>
        )}
      </div>
    </>
  );
}

/* ─── Writing (Dev.to) ───────────────────────────────────────── */

function WritingCard({ data }: { data: LayoutData }) {
  const d = data.devto?.data;
  if (!d || d.articles.length === 0) return null;
  return (
    <>
      <div className={styles.kicker}>Tomes · Dev.to</div>
      <h2 className={styles.title}>Recent essays</h2>
      <div className={styles.statRow}>
        <a
          href={`https://dev.to/${d.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.statHandle}
        >
          @{d.username} ↗
        </a>
      </div>
      <div className={styles.shelf}>
        {d.articles.slice(0, 5).map((a) => (
          <a
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.shelfItem}
          >
            <span className={styles.shelfItemTitle}>{a.title}</span>
            <span className={styles.shelfItemMeta}>
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
    </>
  );
}

/* ─── ML (Hugging Face) ──────────────────────────────────────── */

function MLCard({ data }: { data: LayoutData }) {
  const hf = data.huggingface?.data;
  if (!hf || hf.items.length === 0) return null;
  return (
    <>
      <div className={styles.kicker}>Artifacts · Hugging Face</div>
      <h2 className={styles.title}>Models &amp; datasets</h2>
      <div className={styles.statRow}>
        <a
          href={`https://huggingface.co/${hf.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.statHandle}
        >
          @{hf.username} ↗
        </a>
      </div>
      <div className={styles.shelf}>
        {hf.items.slice(0, 5).map((it) => (
          <a
            key={`${it.kind}-${it.id}`}
            href={it.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.shelfItem}
          >
            <span className={styles.shelfItemTitle}>{it.name}</span>
            <span className={styles.shelfItemMeta}>
              {it.kind}
              {it.likes > 0 ? ` · ♥ ${it.likes}` : ""}
            </span>
          </a>
        ))}
      </div>
    </>
  );
}

/* ─── Links ──────────────────────────────────────────────────── */

function LinksCard({ data }: { data: LayoutData }) {
  if (data.customLinks.length === 0) return null;
  return (
    <>
      <div className={styles.kicker}>Gateways</div>
      <h2 className={styles.title}>Elsewhere</h2>
      <div className={styles.shelf}>
        {data.customLinks.map((l) => (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.shelfItem}
          >
            <div className={styles.shelfItemHead}>
              <span className={styles.shelfItemTitle}>{l.label}</span>
              <span className={styles.shelfItemMeta}>{prettyHost(l.url)} ↗</span>
            </div>
            {l.description && (
              <p className={styles.shelfItemDesc}>{l.description}</p>
            )}
          </a>
        ))}
      </div>
    </>
  );
}

/* ─── Files ──────────────────────────────────────────────────── */

function FilesCard({ data }: { data: LayoutData }) {
  const items: Array<{
    id: string;
    label: string;
    url: string;
    format: string;
  }> = [];
  if (data.resumeCloudinaryId) {
    items.push({
      id: "resume",
      label: "Resume",
      url: deriveUrl(data.resumeCloudinaryId, { resourceType: "raw" }),
      format: "pdf",
    });
  }
  for (const f of data.files) {
    items.push({
      id: f.id,
      label: f.label,
      url: deriveUrl(f.publicId, { resourceType: f.resourceType }),
      format: f.format,
    });
  }
  if (items.length === 0) return null;
  return (
    <>
      <div className={styles.kicker}>Scrolls</div>
      <h2 className={styles.title}>Documents</h2>
      <div className={styles.shelf}>
        {items.map((f) => (
          <a
            key={f.id}
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.shelfItem}
          >
            <span className={styles.shelfItemTitle}>{f.label}</span>
            <span className={styles.shelfItemMeta}>{f.format} ↗</span>
          </a>
        ))}
      </div>
    </>
  );
}

/* ─── Socials ────────────────────────────────────────────────── */

function SocialsCard({ data }: { data: LayoutData }) {
  const entries: Array<{ label: string; href: string }> = [];
  if (data.socials.linkedin)
    entries.push({ label: "LinkedIn", href: data.socials.linkedin });
  if (data.socials.twitter)
    entries.push({
      label: "Twitter",
      href: `https://twitter.com/${data.socials.twitter.replace(/^@/, "")}`,
    });
  if (data.socials.github)
    entries.push({
      label: "GitHub",
      href: `https://github.com/${data.socials.github}`,
    });
  if (data.socials.website)
    entries.push({ label: "Website", href: data.socials.website });
  if (data.socials.email)
    entries.push({ label: "Email", href: `mailto:${data.socials.email}` });
  for (const s of data.customSocials) {
    entries.push({ label: s.label, href: s.url });
  }
  if (entries.length === 0) return null;
  return (
    <>
      <div className={styles.kicker}>Contact</div>
      <h2 className={styles.title}>Stay in touch</h2>
      <div className={styles.shelf}>
        {entries.map((e, i) => (
          <a
            key={`${e.label}-${i}`}
            href={e.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.shelfItem}
          >
            <span className={styles.shelfItemTitle}>{e.label}</span>
            <span className={styles.shelfItemMeta}>↗</span>
          </a>
        ))}
      </div>
    </>
  );
}

/* ─── Horizon ────────────────────────────────────────────────── */

function HorizonCard() {
  return (
    <div className={styles.cardHorizon}>
      <p className={styles.horizonText}>[ Quest complete ]</p>
      <Link href="/" className={styles.horizonLink}>
        Made with Pofolio →
      </Link>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.statCell}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function DiffBar({
  label,
  count,
  total,
  kind,
}: {
  label: string;
  count: number;
  total: number;
  kind: "easy" | "medium" | "hard";
}) {
  const pct = total > 0 ? Math.min(100, (count / total) * 100) : 0;
  const fillCls =
    kind === "easy"
      ? styles.diffBarFillEasy
      : kind === "medium"
        ? styles.diffBarFillMedium
        : styles.diffBarFillHard;
  return (
    <div className={styles.diffBar}>
      <span className={styles.diffBarLabel}>{label}</span>
      <span className={styles.diffBarTrack}>
        <span className={`${styles.diffBarFill} ${fillCls}`} style={{ width: `${pct}%` }} />
      </span>
      <span className={styles.diffBarCount}>{count} / {total}</span>
    </div>
  );
}

/* ─── Activity heatmap (proper grid) ─────────────────────────── */
// Returns the list of years present in a heatmap dataset, plus "ALL".
function getAvailableYears(
  days: Array<{ date: string; count: number }>,
): string[] {
  if (!days || days.length === 0) return ["ALL"];
  const set = new Set<string>();
  for (const d of days) {
    if (d.date && d.date.length >= 4) set.add(d.date.slice(0, 4));
  }
  return ["ALL", ...Array.from(set).sort().reverse()];
}

function YearTabs({
  years,
  active,
  onChange,
}: {
  years: string[];
  active: string;
  onChange: (y: string) => void;
}) {
  if (years.length <= 1) return null;
  return (
    <div className={styles.yearTabs}>
      {years.map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => onChange(y)}
          className={`${styles.yearTab} ${y === active ? styles.yearTabActive : ""}`}
        >
          {y}
        </button>
      ))}
    </div>
  );
}

// Proper GitHub-style heatmap grid: 7 rows (days of week) × N weeks
// (columns). Each cell intensity scales from no activity to max.
function ActivityHeatmap({
  days,
  year,
  title = "Activity",
}: {
  days: Array<{ date: string; count: number }>;
  year: string;
  title?: string;
}) {
  const { cells, weeks, maxCount, total, active, months } = useMemo(() => {
    if (days.length === 0) {
      return {
        cells: [] as Array<{ x: number; y: number; count: number; date: string }>,
        weeks: 0,
        maxCount: 0,
        total: 0,
        active: 0,
        months: [] as Array<{ x: number; label: string }>,
      };
    }

    // Build a lookup of date → count for all data
    const countByDate = new Map<string, number>();
    for (const d of days) countByDate.set(d.date, d.count);

    // Determine the grid's date range.
    //   year === "ALL" → first data date to last data date
    //   year === "YYYY" → Jan 1 to Dec 31 of that year (always 12 months,
    //     even if some months have no data — that was the bug)
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

    // Align grid start to the Sunday on or before rangeStart
    const gridStart = new Date(rangeStart);
    gridStart.setUTCDate(rangeStart.getUTCDate() - rangeStart.getUTCDay());

    // Iterate every day from gridStart through rangeEnd, generating a
    // cell for each — including days with zero activity. This is what
    // makes the heatmap span all 12 months consistently.
    let max = 0;
    let totalCnt = 0;
    let activeCnt = 0;
    const cellList: Array<{ x: number; y: number; count: number; date: string }> = [];
    const cursor = new Date(gridStart);
    while (cursor.getTime() <= rangeEnd.getTime()) {
      const diffMs = cursor.getTime() - gridStart.getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      const week = Math.floor(diffDays / 7);
      const dayOfWeek = diffDays % 7;
      const dateStr = cursor.toISOString().slice(0, 10);
      const count = countByDate.get(dateStr) ?? 0;
      cellList.push({ x: week, y: dayOfWeek, count, date: dateStr });
      // Stats only count cells WITHIN the actual range (not the Sunday-alignment padding)
      if (cursor.getTime() >= rangeStart.getTime()) {
        if (count > max) max = count;
        totalCnt += count;
        if (count > 0) activeCnt++;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const weeksCnt =
      cellList.length > 0 ? Math.max(...cellList.map((c) => c.x)) + 1 : 0;

    // Month labels: emit once per month at the first column of that month
    const monthList: Array<{ x: number; label: string }> = [];
    let lastMonth = -1;
    for (const c of cellList) {
      const date = new Date(c.date + "T00:00:00Z");
      const m = date.getUTCMonth();
      if (m !== lastMonth && c.y < 2) {
        monthList.push({
          x: c.x,
          label: date.toLocaleDateString("en-US", {
            month: "short",
            timeZone: "UTC",
          }),
        });
        lastMonth = m;
      }
    }

    return {
      cells: cellList,
      weeks: weeksCnt,
      maxCount: max,
      total: totalCnt,
      active: activeCnt,
      months: monthList,
    };
  }, [days, year]);

  if (cells.length === 0) {
    return (
      <div className={styles.heatmap}>
        <div className={styles.heatmapHead}>
          <span className={styles.heatmapTitle}>{title}</span>
          <span className={styles.heatmapMeta}>No data</span>
        </div>
      </div>
    );
  }

  // Cell sizing — scale to fit available width
  const CELL = 11; // width per column in viewBox units (cell + 1 gap)
  const SIZE = 9; // actual cell size
  const ROWS = 7;
  const monthLabelH = 12;
  const gridH = ROWS * CELL;
  const totalH = monthLabelH + gridH;
  const totalW = weeks * CELL;

  return (
    <div className={styles.heatmap}>
      <div className={styles.heatmapHead}>
        <span className={styles.heatmapTitle}>{title}</span>
        <span className={styles.heatmapMeta}>
          {total.toLocaleString("en-US")} total · {active} active days
        </span>
      </div>
      <svg
        className={styles.heatmapGrid}
        viewBox={`0 0 ${totalW} ${totalH}`}
        preserveAspectRatio="xMinYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Month labels */}
        {months.map((m) => (
          <text
            key={`m-${m.x}-${m.label}`}
            x={m.x * CELL}
            y={9}
            fill="rgba(166, 152, 200, 0.7)"
            fontSize="8"
            fontFamily="ui-monospace, monospace"
            style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            {m.label}
          </text>
        ))}
        {/* Cells */}
        {cells.map((c, i) => {
          const intensity = maxCount > 0 ? c.count / maxCount : 0;
          const fill =
            c.count === 0
              ? "rgba(123, 109, 255, 0.08)"
              : `rgba(123, 109, 255, ${0.25 + intensity * 0.7})`;
          return (
            <rect
              key={`c-${i}`}
              x={c.x * CELL}
              y={monthLabelH + c.y * CELL}
              width={SIZE}
              height={SIZE}
              fill={fill}
              rx="1"
            >
              <title>{`${c.date}: ${c.count} ${c.count === 1 ? "submission" : "submissions"}`}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}

function Sparkline({
  points,
  stroke = "#a698ff",
}: {
  points: Array<{ t: number; v: number }>;
  stroke?: string;
}) {
  const sorted = useMemo(
    () => [...points].sort((a, b) => a.t - b.t),
    [points],
  );
  if (sorted.length < 2) return null;
  const W = 300;
  const H = 56;
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

function prettyHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Helper: compute max streak from heatmap days (consecutive days with count > 0)
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

/* ─── Build the chamber list ─────────────────────────────────── */

function buildCards(data: LayoutData): CardDef[] {
  const out: CardDef[] = [];

  out.push({
    key: "identity",
    weight: 1.4,
    slot: "center",
    sysLabel: "Player",
    variant: "cardIdentity",
    render: () => <IdentityCard data={data} />,
  });

  if (data.bio) {
    out.push({
      key: "about",
      weight: 1.2,
      slot: "center",
      sysLabel: "Biography",
      variant: "cardAbout",
      render: () => <AboutCard data={data} />,
    });
  }

  data.experience.forEach((entry, i) => {
    out.push({
      key: `exp-${entry.id}`,
      weight: 0.7,
      slot: i % 2 === 0 ? "left" : "right",
      sysLabel: `Mission ${String(i + 1).padStart(2, "0")}`,
      variant: "cardMarker",
      render: () => <ExperienceCard entry={entry} />,
    });
  });

  data.education.forEach((entry, i) => {
    out.push({
      key: `edu-${entry.id}`,
      weight: 0.7,
      slot: (i + data.experience.length) % 2 === 0 ? "left" : "right",
      sysLabel: `Training ${String(i + 1).padStart(2, "0")}`,
      variant: "cardMarker",
      render: () => <EducationCard entry={entry} />,
    });
  });

  if (data.skills.length > 0 || data.skillGroups.length > 0) {
    out.push({
      key: "skills",
      weight: 1.1,
      slot: "center",
      sysLabel: "Abilities",
      variant: "cardSkills",
      render: () => <SkillsCard data={data} />,
    });
  }

  data.projects.forEach((p, i) => {
    out.push({
      key: `proj-${p.id}`,
      weight: 1.4,
      slot: i % 2 === 0 ? "right" : "left",
      sysLabel: `Quest ${String(i + 1).padStart(2, "0")}`,
      variant: "cardProject",
      render: ({ onOpenProject: _onOpenProject }) => null, // ProjectCard requires sysBar — handled in main render
    });
  });

  if (data.github) {
    out.push({
      key: "github-primary",
      weight: 1.4,
      slot: "left",
      sysLabel: "Guild · GitHub",
      variant: "cardStatsHalf",
      pairedWith: "github-secondary",
      yearGroup: "github",
      render: ({ year, setYear }) => (
        <GitHubCard data={data} section="primary" year={year} setYear={setYear} />
      ),
    });
    out.push({
      key: "github-secondary",
      weight: 0,
      slot: "right",
      sysLabel: "Guild · GitHub",
      variant: "cardStatsHalf",
      yearGroup: "github",
      render: ({ year, setYear }) => (
        <GitHubCard data={data} section="secondary" year={year} setYear={setYear} />
      ),
    });
  }
  if (data.leetcode) {
    out.push({
      key: "leetcode-primary",
      weight: 1.4,
      slot: "left",
      sysLabel: "Guild · LeetCode",
      variant: "cardStatsHalf",
      pairedWith: "leetcode-secondary",
      yearGroup: "leetcode",
      render: ({ year, setYear }) => (
        <LeetCodeCard data={data} section="primary" year={year} setYear={setYear} />
      ),
    });
    out.push({
      key: "leetcode-secondary",
      weight: 0,
      slot: "right",
      sysLabel: "Guild · LeetCode",
      variant: "cardStatsHalf",
      yearGroup: "leetcode",
      render: ({ year, setYear }) => (
        <LeetCodeCard data={data} section="secondary" year={year} setYear={setYear} />
      ),
    });
  }
  if (data.codeforces) {
    out.push({
      key: "codeforces-primary",
      weight: 1.4,
      slot: "left",
      sysLabel: "Guild · Codeforces",
      variant: "cardStatsHalf",
      pairedWith: "codeforces-secondary",
      yearGroup: "codeforces",
      render: ({ year, setYear }) => (
        <CodeforcesCard data={data} section="primary" year={year} setYear={setYear} />
      ),
    });
    out.push({
      key: "codeforces-secondary",
      weight: 0,
      slot: "right",
      sysLabel: "Guild · Codeforces",
      variant: "cardStatsHalf",
      yearGroup: "codeforces",
      render: ({ year, setYear }) => (
        <CodeforcesCard data={data} section="secondary" year={year} setYear={setYear} />
      ),
    });
  }

  if (data.devto) {
    out.push({
      key: "writing",
      weight: 0.9,
      slot: "right",
      sysLabel: "Tomes",
      render: () => <WritingCard data={data} />,
    });
  }

  if (data.huggingface) {
    out.push({
      key: "ml",
      weight: 0.9,
      slot: "left",
      sysLabel: "Artifacts",
      render: () => <MLCard data={data} />,
    });
  }

  if (data.customLinks.length > 0) {
    out.push({
      key: "links",
      weight: 0.8,
      slot: "right",
      sysLabel: "Gateways",
      render: () => <LinksCard data={data} />,
    });
  }

  const hasFiles = data.resumeCloudinaryId || data.files.length > 0;
  if (hasFiles) {
    out.push({
      key: "files",
      weight: 0.7,
      slot: "left",
      sysLabel: "Scrolls",
      render: () => <FilesCard data={data} />,
    });
  }

  const hasSocials =
    Object.values(data.socials).some(
      (v) => typeof v === "string" && v.length > 0,
    ) || data.customSocials.length > 0;
  if (hasSocials) {
    out.push({
      key: "socials",
      weight: 0.9,
      slot: "center",
      sysLabel: "Contact",
      render: () => <SocialsCard data={data} />,
    });
  }

  out.push({
    key: "horizon",
    weight: 0.9,
    slot: "center",
    sysLabel: "End",
    variant: "cardHorizon",
    render: () => <HorizonCard />,
  });

  return out;
}

/* ─── Main component ─────────────────────────────────────────── */

export function Cards({ data, progress, onOpenProject }: Props) {
  const cards = useMemo(() => buildCards(data), [data]);

  // Per-platform year filter state. Default "ALL" — the activity heatmap
  // shows everything available, but the user can narrow to a year.
  const [yearFilters, setYearFilters] = useState<Record<string, string>>({});
  const setYearFor = (group: string) => (y: string) =>
    setYearFilters((prev) => ({ ...prev, [group]: y }));
  const getYearFor = (group: string | undefined) =>
    group ? (yearFilters[group] ?? "ALL") : "ALL";

  // Windows: each "primary" card carries the weight; paired secondaries
  // share their primary's window so both cards appear simultaneously.
  const windows = useMemo(() => {
    // Sum weights of weighted cards (excludes paired secondaries which
    // have weight=0). Total comes out the same — paired secondaries don't
    // consume their own scroll time.
    const total = cards.reduce((s, c) => s + c.weight, 0);
    const out: Record<string, [number, number]> = {};
    let cursor = 0;
    for (const c of cards) {
      if (c.weight === 0) continue; // skip; resolved in second pass
      const w = c.weight / total;
      out[c.key] = [cursor, cursor + w];
      cursor += w;
    }
    // Second pass: paired secondaries share their primary's window.
    for (const c of cards) {
      if (c.weight === 0 && c.yearGroup) {
        // Find the primary of this pair — by convention, primary key
        // starts with the yearGroup and ends with "-primary".
        const primaryKey = `${c.yearGroup}-primary`;
        if (out[primaryKey]) out[c.key] = out[primaryKey];
      }
    }
    return out;
  }, [cards]);

  // Project lookup for ProjectCard render path
  const projectByKey = useMemo(() => {
    const out: Record<string, LayoutData["projects"][number]> = {};
    for (const p of data.projects) out[`proj-${p.id}`] = p;
    return out;
  }, [data.projects]);

  // Total cards for the "01 / NN" counter in the sys bar — count only
  // primary cards (we don't want 13 / 16 for users since secondaries
  // are visually part of the same "section").
  const total = cards.filter((c) => c.weight > 0).length;

  // Map each card to its display index — primary cards get a fresh number;
  // paired secondaries inherit their primary's number.
  const indexByKey = useMemo(() => {
    const out: Record<string, number> = {};
    let idx = 0;
    for (const c of cards) {
      if (c.weight > 0) {
        idx++;
        out[c.key] = idx;
      }
    }
    // Secondaries inherit primary's index
    for (const c of cards) {
      if (c.weight === 0 && c.yearGroup) {
        const primaryKey = `${c.yearGroup}-primary`;
        if (out[primaryKey] !== undefined) out[c.key] = out[primaryKey];
      }
    }
    return out;
  }, [cards]);

  return (
    <>
      {cards.map((c) => {
        const w = windows[c.key];
        if (!w) return null;
        const [start, end] = w;
        const { opacity, y } = cardVisibility(progress, start, end);

        // For paired cards (cardStatsHalf variant), use the dedicated
        // pairedLeft / pairedRight positioning classes which override
        // the regular cardLeft / cardRight to allow side-by-side.
        const isPaired = c.variant === "cardStatsHalf";
        const slotCls = isPaired
          ? c.slot === "left"
            ? styles.pairedLeft
            : styles.pairedRight
          : slotClass(c.slot);

        const transform = isPaired
          ? `translate(0, calc(-50% + ${y}px))`
          : slotTransform(c.slot, y);

        const variantCls = c.variant
          ? styles[c.variant as keyof typeof styles]
          : "";
        const style: CSSProperties = {
          opacity,
          transform,
          visibility: opacity < 0.01 ? "hidden" : "visible",
        };
        const aliveCls = opacity > 0.5 ? styles.cardActive : "";

        const sysBar = (
          <SysBar
            label={c.sysLabel}
            index={indexByKey[c.key] ?? 0}
            total={total}
          />
        );

        // Year helpers — for cards in a yearGroup, look up the current
        // year and provide a setter that updates the shared state.
        const yearHelpers: RenderHelpers = {
          onOpenProject,
          year: getYearFor(c.yearGroup),
          setYear: c.yearGroup ? setYearFor(c.yearGroup) : () => {},
        };

        let inner: React.ReactNode;
        if (c.key.startsWith("proj-")) {
          const project = projectByKey[c.key];
          if (!project) return null;
          inner = (
            <ProjectCard
              project={project}
              onOpen={() => onOpenProject(project)}
              sysBar={sysBar}
            />
          );
        } else if (
          c.variant === "cardIdentity" ||
          c.variant === "cardHorizon"
        ) {
          inner = c.render(yearHelpers);
        } else {
          inner = (
            <>
              {sysBar}
              {c.render(yearHelpers)}
            </>
          );
        }

        return (
          <div
            key={c.key}
            className={`${styles.card} ${slotCls} ${variantCls} ${aliveCls}`}
            style={style}
          >
            {inner}
          </div>
        );
      })}
    </>
  );
}