"use client";

import { useEffect, useState } from "react";
import type { LayoutData } from "@/components/layouts/types";
import styles from "./bento.module.css";
import { ContributionHeatmap } from "./Heatmap";

/*
 * App content components — each function corresponds to one dock app.
 *
 * Conventions:
 *   - Each app is a self-contained piece of JSX rendered inside an
 *     <AppWindow>. The window shell handles the title bar, scrolling,
 *     and close interactions; apps just render content.
 *   - Apps assume their underlying data exists. The dock already filters
 *     out apps without data, so we don't need defensive `?? return null`
 *     branches inside (but we add a few for type safety).
 *   - Data shapes are verified against existing templates (Press's
 *     Sections.tsx) — same field names, no inferences.
 */

const cloudName =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD ||
  "demo";

function cloudinaryUrl(
  publicId: string,
  resourceType: "image" | "video" | "raw" = "image",
  transform = "",
): string {
  const t = transform ? `${transform}/` : "";
  return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${t}${publicId}`;
}

/* Compute the longest run of consecutive days with submissions in a
 * heatmap. Used by LeetCode + Codeforces apps for the "Max streak" stat.
 * Same algorithm as Terminal and Press. */
function computeMaxStreak(
  heatmap: Array<{ date: string; count: number }>,
): number {
  if (heatmap.length === 0) return 0;
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

/* ═══ ABOUT ══════════════════════════════════════════════════════════ */

export function AboutApp({ data }: { data: LayoutData }) {
  if (!data.bio && !data.headline) return null;
  // Render the bio as multiple paragraphs (split on blank lines) so a
  // long-form bio doesn't render as one solid wall of text.
  const paragraphs = (data.bio ?? "").split(/\n{2,}/).filter(Boolean);
  return (
    <>
      <div className={styles.appKicker}>
        <span className={styles.accent}>◍</span> About.app
      </div>
      <h2 className={styles.appTitle}>
        About <span className={styles.italic}>{data.displayName}</span>
      </h2>

      {data.headline && <p className={styles.appSub}>{data.headline}</p>}

      {paragraphs.length > 0 && (
        <div className={styles.aboutBody}>
          {paragraphs.map((p, i) => (
            <p key={i} className={styles.aboutPara}>
              {p}
            </p>
          ))}
        </div>
      )}
    </>
  );
}

/* ═══ PROJECTS ═══════════════════════════════════════════════════════ */

export function ProjectsApp({ data }: { data: LayoutData }) {
  // Two-level navigation inside the Projects app:
  //   - LIST view: featured hero + grid of cards (default)
  //   - DETAIL view: full project info, replaces the list
  // Detail is gated by selected project ID; null = list view. We use the
  // project ID (not index) so order changes don't break the selection.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // When the user enters or leaves a detail view, scroll the parent
  // window body to the top. We walk up to find the .windowBody scroller
  // and reset its scrollTop. Using a data-attribute lookup so we don't
  // need to thread refs through AppWindow → ProjectsApp.
  useEffect(() => {
    if (typeof document === "undefined") return;
    // requestAnimationFrame so the new content has rendered before we scroll.
    requestAnimationFrame(() => {
      const scroller = document.querySelector<HTMLElement>(
        '[data-bento-window-body="true"]',
      );
      if (scroller) scroller.scrollTop = 0;
    });
  }, [selectedId]);

  if (data.projects.length === 0) return null;

  // Featured: explicit flag, falling back to first project. Matches the
  // pattern from Press and the prior Bento version.
  const featured = data.projects.find((p) => p.featured) ?? data.projects[0];
  const others = data.projects.filter((p) => p.id !== featured.id);

  const selectedProject =
    selectedId !== null
      ? data.projects.find((p) => p.id === selectedId)
      : null;

  // DETAIL view — full project info, back arrow at the top to return to
  // the list. The window's close button (red traffic light) closes the
  // whole window; this back button stays inside the app.
  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  // LIST view.
  return (
    <>
      <div className={styles.appKicker}>
        <span className={styles.accent}>●</span> Projects.app
      </div>
      <h2 className={styles.appTitle}>
        Selected <span className={styles.italic}>work</span>
      </h2>

      <div className={styles.projectsList}>
        <FeaturedProjectCard
          project={featured}
          onOpen={() => setSelectedId(featured.id)}
        />
        {others.length > 0 && (
          <div className={styles.projectsGrid}>
            {others.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => setSelectedId(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ─── LIST view cards (preview only, clicking opens detail) ─── */

function FeaturedProjectCard({
  project,
  onOpen,
}: {
  project: LayoutData["projects"][number];
  onOpen: () => void;
}) {
  const hero = project.images?.[0];
  return (
    // Whole card is a button — clicking anywhere opens the detail view.
    // No external links live here; those move to the detail page.
    <button
      type="button"
      className={`${styles.projectsFeatured} ${styles.projectsFeaturedButton}`}
      onClick={onOpen}
    >
      {hero && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cloudinaryUrl(
            hero.publicId,
            "image",
            "w_1800,h_900,c_fill,f_auto,q_auto",
          )}
          alt={hero.caption || project.title}
        />
      )}
      <div className={styles.projectsFeaturedContent}>
        <div className={styles.projectsFeaturedKicker}>
          ★ Featured
          {project.year ? ` · ${project.year}` : ""}
          {project.role ? ` · ${project.role}` : ""}
        </div>
        <h3 className={styles.projectsFeaturedTitle}>{project.title}</h3>
        {project.description && (
          <p className={styles.projectsFeaturedLede}>
            {project.description.split(/\n{2,}/)[0]}
          </p>
        )}
        {project.tech && project.tech.length > 0 && (
          <div className={styles.projectsFeaturedMeta}>
            {project.tech.slice(0, 6).map((t) => (
              <span key={t} className={styles.pill}>
                {t}
              </span>
            ))}
            {project.tech.length > 6 && (
              <span className={styles.pill}>+{project.tech.length - 6}</span>
            )}
            <span className={`${styles.pill} ${styles.pillAccent}`}>
              View project →
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

function ProjectCard({
  project,
  onOpen,
}: {
  project: LayoutData["projects"][number];
  onOpen: () => void;
}) {
  const hero = project.images?.[0];
  return (
    <button
      type="button"
      className={styles.projectCard}
      onClick={onOpen}
    >
      {hero ? (
        <div
          className={styles.projectCardArt}
          style={{
            backgroundImage: `url(${cloudinaryUrl(
              hero.publicId,
              "image",
              "w_800,h_450,c_fill,f_auto,q_auto",
            )})`,
          }}
        />
      ) : (
        <div className={styles.projectCardArtBlob} />
      )}
      <div className={styles.projectCardBody}>
        {(project.year || project.role) && (
          <div className={styles.projectCardKicker}>
            {project.year}
            {project.year && project.role ? " · " : ""}
            {project.role}
          </div>
        )}
        <h4 className={styles.projectCardTitle}>{project.title}</h4>
        {project.description && (
          <p className={styles.projectCardDesc}>
            {project.description.split(/\n{2,}/)[0]}
          </p>
        )}
        {project.tech && project.tech.length > 0 && (
          <div className={styles.projectCardMeta}>
            {project.tech.slice(0, 4).map((t) => (
              <span key={t} className={styles.pill}>
                {t}
              </span>
            ))}
            {project.tech.length > 4 && (
              <span className={styles.pill}>+{project.tech.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

/* ─── DETAIL view — full project content ─── */

function ProjectDetail({
  project,
  onBack,
}: {
  project: LayoutData["projects"][number];
  onBack: () => void;
}) {
  const hero = project.images?.[0];
  const extraImages = (project.images ?? []).slice(1);
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className={styles.projectDetailBack}
        aria-label="Back to all projects"
      >
        ← All projects
      </button>

      {hero && (
        <div className={styles.projectDetailHero}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cloudinaryUrl(
              hero.publicId,
              "image",
              "w_1800,h_900,c_fill,f_auto,q_auto",
            )}
            alt={hero.caption || project.title}
          />
        </div>
      )}

      <div className={styles.appKicker} style={{ marginTop: hero ? 20 : 0 }}>
        <span className={styles.accent}>●</span>
        {project.year && ` ${project.year}`}
        {project.role && ` · ${project.role}`}
      </div>
      <h2 className={styles.appTitle}>{project.title}</h2>

      {project.description && (
        <div className={styles.projectDetailBody}>
          {project.description.split(/\n{2,}/).map((para, i) => (
            <p key={i} className={styles.projectDetailPara}>
              {para}
            </p>
          ))}
        </div>
      )}

      {project.tech && project.tech.length > 0 && (
        <div className={styles.projectDetailSection}>
          <div className={styles.projectDetailSectionLabel}>Stack</div>
          <div className={styles.projectDetailTech}>
            {project.tech.map((t) => (
              <span key={t} className={styles.pill}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {(project.demoUrl || project.sourceUrl || project.videoUrl) && (
        <div className={styles.projectDetailSection}>
          <div className={styles.projectDetailSectionLabel}>Links</div>
          <div className={styles.projectDetailLinks}>
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.pill} ${styles.pillAccent}`}
              >
                Live demo ↗
              </a>
            )}
            {project.sourceUrl && (
              <a
                href={project.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.pill}
              >
                Source ↗
              </a>
            )}
            {project.videoUrl && (
              <a
                href={project.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.pill}
              >
                Video ↗
              </a>
            )}
          </div>
        </div>
      )}

      {extraImages.length > 0 && (
        <div className={styles.projectDetailSection}>
          <div className={styles.projectDetailSectionLabel}>Gallery</div>
          <div className={styles.projectDetailGallery}>
            {extraImages.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={cloudinaryUrl(
                  img.publicId,
                  "image",
                  "w_1200,h_750,c_fill,f_auto,q_auto",
                )}
                alt={img.caption || ""}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ═══ GITHUB ═════════════════════════════════════════════════════════ */

export function GitHubApp({ data }: { data: LayoutData }) {
  const g = data.github?.data;
  if (!g) return null;
  const handle = g.user.login;
  const days = g.contributions?.days ?? [];

  return (
    <>
      <div className={styles.appKicker}>
        <span className={styles.accent}>◆</span> GitHub.app ·{" "}
        <a
          href={`https://github.com/${handle}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          @{handle} ↗
        </a>
      </div>
      <h2 className={styles.appTitle}>
        Code on <span className={styles.italic}>GitHub</span>
      </h2>

      <div className={styles.statBig}>
        <span className={styles.statBigNum}>
          {(g.contributions?.total ?? 0).toLocaleString("en-US")}
        </span>
        <span className={styles.statBigLabel}>contributions / year</span>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statCell}>
          <span className={styles.statCellNum}>
            {g.user.publicRepos.toLocaleString("en-US")}
          </span>
          <span className={styles.statCellLabel}>Repos</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statCellNum}>
            {g.totalStars.toLocaleString("en-US")}
          </span>
          <span className={styles.statCellLabel}>Stars</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statCellNum}>
            {g.user.followers.toLocaleString("en-US")}
          </span>
          <span className={styles.statCellLabel}>Followers</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statCellNum}>
            {g.languageBreakdown?.[0]?.language ?? "—"}
          </span>
          <span className={styles.statCellLabel}>Top language</span>
        </div>
      </div>

      {days.length > 0 && (
        <ContributionHeatmap days={days} label="Contribution activity" />
      )}

      {/* Top repos — ranked by stars (the integration sorts them). Was
       * a parity gap: integration returns them but no template surfaced
       * them. Each row links to the repo on GitHub. */}
      {g.topRepos && g.topRepos.length > 0 && (
        <div className={styles.heatmapWrap}>
          <div className={styles.heatmapLabel}>Top repositories</div>
          <div className={styles.rowList} style={{ marginTop: 6 }}>
            {g.topRepos.slice(0, 6).map((repo) => (
              <a
                key={repo.fullName}
                href={repo.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.rowItem}
              >
                <div>
                  <div className={styles.rowItemTitle}>{repo.name}</div>
                  {repo.description && (
                    <div
                      className={styles.rowItemMeta}
                      style={{
                        textTransform: "none",
                        letterSpacing: 0,
                        fontFamily: "var(--serif)",
                        fontStyle: "italic",
                        fontSize: 13,
                        color: "var(--fg-2)",
                      }}
                    >
                      {repo.description}
                    </div>
                  )}
                </div>
                <div className={styles.rowItemAside}>
                  {repo.language && (
                    <span style={{ marginRight: 10 }}>{repo.language}</span>
                  )}
                  ★ {repo.stars.toLocaleString("en-US")}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {g.languageBreakdown && g.languageBreakdown.length > 0 && (
        <div className={styles.heatmapWrap}>
          <div className={styles.heatmapLabel}>Top languages</div>
          <LanguageBars languages={g.languageBreakdown} />
        </div>
      )}
    </>
  );
}

/* Horizontal language breakdown — each row is a language with its share
 * of the user's repos. We show up to 8 languages to fit in the window
 * without overwhelming. `count` is the number of repos using that
 * language (not bytes — the integration tallies repos by primary lang). */
function LanguageBars({
  languages,
}: {
  languages: Array<{ language: string; count: number }>;
}) {
  // Each language gets its own deterministic accent color from the
  // template's palette. The mapping is stable so the same language always
  // gets the same color across reloads.
  const palette = ["#ff8b73", "#b366ff", "#4d7fff", "#2dd4bf", "#ffd86b", "#5be0b2", "#ff5e9c", "#6ea3ff"];
  const total = languages.reduce((s, l) => s + l.count, 0) || 1;
  const top = languages.slice(0, 8);
  return (
    <div className={styles.langList}>
      {top.map((l, i) => {
        const pct = (l.count / total) * 100;
        return (
          <div key={l.language} className={styles.langRow}>
            <span className={styles.langLabel}>{l.language}</span>
            <div className={styles.langTrack}>
              <div
                className={styles.langFill}
                style={{
                  width: `${Math.max(2, pct)}%`,
                  background: palette[i % palette.length],
                }}
              />
            </div>
            <span className={styles.langPct}>{pct.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══ LEETCODE ═══════════════════════════════════════════════════════ */

export function LeetCodeApp({ data }: { data: LayoutData }) {
  const l = data.leetcode?.data;
  if (!l) return null;
  const handle = l.username;
  const total = l.totalSolved ?? 0;
  const easy = l.easySolved ?? 0;
  const medium = l.mediumSolved ?? 0;
  const hard = l.hardSolved ?? 0;
  // Approximate problem-bank totals — matches Press's RatioBar fallbacks.
  // Real totals shift over time but stay close enough that bar widths look
  // proportional. If LeetCode adds an explicit totals field later, we can
  // switch to it.
  const TOTAL_EASY = 875;
  const TOTAL_MEDIUM = 1900;
  const TOTAL_HARD = 860;

  // Submission heatmap, if available
  const days = l.submissionHeatmap ?? [];

  return (
    <>
      <div className={styles.appKicker}>
        <span className={styles.accent}>●</span> LeetCode.app ·{" "}
        <a
          href={`https://leetcode.com/u/${handle}/`}
          target="_blank"
          rel="noopener noreferrer"
        >
          @{handle} ↗
        </a>
      </div>
      <h2 className={styles.appTitle}>
        Problems <span className={styles.italic}>solved</span>
      </h2>
      {/* Real name shown as subtitle if available — parity with Terminal
       * which has it as KV "name". */}
      {l.realName && <p className={styles.appSub}>{l.realName}</p>}

      <div className={styles.statBig}>
        <span className={styles.statBigNum}>{total}</span>
        <span className={styles.statBigLabel}>total solved</span>
      </div>

      {/* Stat row — surfaces all the extra fields the LeetCode integration
       * provides (country, streak, active days, ranking). Matches the
       * parity in Brutalist. */}
      <div className={styles.statRow}>
        <div className={styles.statCell}>
          <span className={styles.statCellNum}>
            {l.ranking !== null && l.ranking !== undefined
              ? l.ranking.toLocaleString("en-US")
              : "—"}
          </span>
          <span className={styles.statCellLabel}>Rank</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statCellNum}>{l.currentStreak ?? 0}</span>
          <span className={styles.statCellLabel}>Current streak</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statCellNum}>{l.totalActiveDays ?? 0}</span>
          <span className={styles.statCellLabel}>Active days</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statCellNum}>{l.country ?? "—"}</span>
          <span className={styles.statCellLabel}>Country</span>
        </div>
      </div>

      <div className={styles.lcBars}>
        <div className={styles.lcBar}>
          <span className={styles.lcBarLabel}>Easy</span>
          <div className={styles.lcBarTrack}>
            <div
              className={`${styles.lcBarFill} ${styles.easy}`}
              style={{
                width: `${Math.min(100, (easy / TOTAL_EASY) * 100)}%`,
              }}
            />
          </div>
          <span className={styles.lcBarCount}>
            {easy} <span style={{ color: "var(--fg-3)" }}>/ {TOTAL_EASY}</span>
          </span>
        </div>
        <div className={styles.lcBar}>
          <span className={styles.lcBarLabel}>Medium</span>
          <div className={styles.lcBarTrack}>
            <div
              className={`${styles.lcBarFill} ${styles.medium}`}
              style={{
                width: `${Math.min(100, (medium / TOTAL_MEDIUM) * 100)}%`,
              }}
            />
          </div>
          <span className={styles.lcBarCount}>
            {medium} <span style={{ color: "var(--fg-3)" }}>/ {TOTAL_MEDIUM}</span>
          </span>
        </div>
        <div className={styles.lcBar}>
          <span className={styles.lcBarLabel}>Hard</span>
          <div className={styles.lcBarTrack}>
            <div
              className={`${styles.lcBarFill} ${styles.hard}`}
              style={{
                width: `${Math.min(100, (hard / TOTAL_HARD) * 100)}%`,
              }}
            />
          </div>
          <span className={styles.lcBarCount}>
            {hard} <span style={{ color: "var(--fg-3)" }}>/ {TOTAL_HARD}</span>
          </span>
        </div>
      </div>

      {/* Contest rating chart — was missing entirely from Bento + Press.
       * Brutalist surfaces it via its own RatingChart component. We reuse
       * the same sparkline-style SVG that Codeforces uses. */}
      {l.contestHistory && l.contestHistory.length >= 2 && (
        <LcContestChart points={l.contestHistory} />
      )}

      {days.length > 0 && (
        <>
          {(() => {
            const max = computeMaxStreak(days);
            if (max <= 0) return null;
            return (
              <div
                style={{
                  marginTop: 28,
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  color: "var(--fg-3)",
                }}
              >
                Max streak: <span style={{ color: "var(--accent)" }}>{max} days</span>
              </div>
            );
          })()}
          <ContributionHeatmap days={days} label="Submission activity" />
        </>
      )}
    </>
  );
}

/* LeetCode contest rating chart — same visual treatment as the Codeforces
 * sparkline, scaled into a fixed viewbox. Uses the lavender purple from
 * the wallpaper palette to differentiate from CF's golden line. */
function LcContestChart({
  points,
}: {
  points: Array<{ rating: number; timestamp: number }>;
}) {
  const ratings = points.map((h) => h.rating);
  const minR = Math.min(...ratings);
  const maxR = Math.max(...ratings);
  const range = maxR - minR || 1;
  const w = 100;
  const h = 30;
  const pts = ratings.map((r, i) => {
    const x = (i / (ratings.length - 1)) * w;
    const y = h - ((r - minR) / range) * (h - 4) - 2;
    return [x, y] as const;
  });
  const polyline = pts
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const last = pts[pts.length - 1];
  const first = pts[0];
  const areaPath = `M ${first[0]},${h} L ${polyline} L ${last[0]},${h} Z`;
  const latest = ratings[ratings.length - 1];
  return (
    <div className={styles.heatmapWrap}>
      <div className={styles.heatmapHeader}>
        <div>
          <div className={styles.heatmapLabel}>Contest rating</div>
          <div className={styles.heatmapMeta}>
            latest {latest} · peak {maxR} · {points.length} contests
          </div>
        </div>
      </div>
      <svg
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
        className={styles.cfSparkline}
        aria-label={`LeetCode contest rating, latest ${latest}`}
      >
        <path d={areaPath} fill="rgba(179, 102, 255, 0.18)" />
        <polyline
          points={polyline}
          fill="none"
          stroke="#b366ff"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/* ═══ CODEFORCES ═════════════════════════════════════════════════════ */

export function CodeforcesApp({ data }: { data: LayoutData }) {
  const c = data.codeforces?.data;
  if (!c) return null;
  const handle = c.user.handle;
  const rating = c.user.rating ?? 0;
  const maxRating = c.user.maxRating ?? rating;
  const rank = c.user.rank ?? "unrated";

  // Sparkline — full rating history, scaled into a fixed viewbox.
  const history = c.ratingHistory ?? [];
  let polyline = "";
  let areaPath = "";
  if (history.length >= 2) {
    const ratings = history.map((h) => h.rating);
    const minR = Math.min(...ratings);
    const maxR = Math.max(...ratings);
    const range = maxR - minR || 1;
    const w = 100;
    const h = 30;
    const pts = ratings.map((r, i) => {
      const x = (i / (ratings.length - 1)) * w;
      const y = h - ((r - minR) / range) * (h - 4) - 2;
      return [x, y] as const;
    });
    polyline = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    // Area under the line for a subtle filled look.
    const last = pts[pts.length - 1];
    const first = pts[0];
    areaPath = `M ${first[0]},${h} L ${polyline} L ${last[0]},${h} Z`;
  }

  return (
    <>
      <div className={styles.appKicker}>
        <span className={styles.accent}>◇</span> Codeforces.app ·{" "}
        <a
          href={`https://codeforces.com/profile/${handle}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          @{handle} ↗
        </a>
      </div>
      <h2 className={styles.appTitle}>
        Competitive <span className={styles.italic}>programming</span>
      </h2>

      <div className={styles.statBig}>
        <span className={styles.statBigNum}>{rating || "—"}</span>
        <span className={styles.statBigLabel}>
          {rank} · max {maxRating || "—"}
        </span>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statCell}>
          <span className={styles.statCellNum}>{c.contestsParticipated}</span>
          <span className={styles.statCellLabel}>Contests</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statCellNum}>{maxRating || "—"}</span>
          <span className={styles.statCellLabel}>Peak rating</span>
        </div>
        {/* If the user provided a country / organization on Codeforces,
         * surface them. Otherwise show "tracked contests" and "latest
         * rating" as fallbacks so the row stays full. Matches the
         * country/org fields brutalist already shows. */}
        {c.user.country ? (
          <div className={styles.statCell}>
            <span className={styles.statCellNum}>{c.user.country}</span>
            <span className={styles.statCellLabel}>Country</span>
          </div>
        ) : (
          <div className={styles.statCell}>
            <span className={styles.statCellNum}>{history.length}</span>
            <span className={styles.statCellLabel}>Tracked</span>
          </div>
        )}
        {c.user.organization ? (
          <div className={styles.statCell}>
            <span className={styles.statCellNum}>{c.user.organization}</span>
            <span className={styles.statCellLabel}>Organization</span>
          </div>
        ) : (
          <div className={styles.statCell}>
            <span className={styles.statCellNum}>
              {history[history.length - 1]?.rating ?? "—"}
            </span>
            <span className={styles.statCellLabel}>Latest</span>
          </div>
        )}
      </div>

      {polyline && (
        <svg
          viewBox="0 0 100 30"
          preserveAspectRatio="none"
          className={styles.cfSparkline}
          aria-label={`Codeforces rating history, max ${maxRating}`}
        >
          <path d={areaPath} fill="rgba(255, 216, 107, 0.15)" />
          <polyline
            points={polyline}
            fill="none"
            stroke="#ffd86b"
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* Submission heatmap moved up — sits between the rating chart and
       * the recent contests list. Recent contests are the "lighter" data
       * (links out to codeforces.com) so they belong at the bottom. */}
      {c.submissionHeatmap && c.submissionHeatmap.length > 0 && (
        <>
          {(() => {
            const max = computeMaxStreak(c.submissionHeatmap);
            if (max <= 0) return null;
            return (
              <div
                style={{
                  marginTop: 28,
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  color: "var(--fg-3)",
                }}
              >
                Max streak: <span style={{ color: "var(--accent)" }}>{max} days</span>
              </div>
            );
          })()}
          <ContributionHeatmap
            days={c.submissionHeatmap}
            label="Submission activity"
          />
        </>
      )}

      {c.recentContests && c.recentContests.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div className={styles.appKicker} style={{ marginBottom: 12 }}>
            Recent contests
          </div>
          <div className={styles.rowList}>
            {c.recentContests.map((r) => {
              const delta = r.newRating - r.oldRating;
              const sign = delta >= 0 ? "+" : "";
              return (
                <a
                  key={r.contestId}
                  href={`https://codeforces.com/contest/${r.contestId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.rowItem}
                >
                  <div>
                    <div className={styles.rowItemTitle}>{r.contestName}</div>
                    <div className={styles.rowItemMeta}>
                      rank {r.rank.toLocaleString("en-US")} · rating{" "}
                      {r.newRating}
                    </div>
                  </div>
                  <div
                    className={styles.rowItemAside}
                    style={{ color: delta >= 0 ? "#5be0b2" : "#ff5e9c" }}
                  >
                    {sign}
                    {delta}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

/* ═══ SKILLS ═════════════════════════════════════════════════════════ */

export function SkillsApp({ data }: { data: LayoutData }) {
  // If the user organized skills into groups, show those. Otherwise fall
  // back to the flat skills list. Both is fine too — render groups then
  // a "Other" block with leftovers, but that's overengineering for now.
  const useGroups = data.skillGroups.length > 0;
  return (
    <>
      <div className={styles.appKicker}>
        <span className={styles.accent}>✦</span> Skills.app
      </div>
      <h2 className={styles.appTitle}>
        Tools of the <span className={styles.italic}>trade</span>
      </h2>

      {useGroups ? (
        data.skillGroups.map((g) => (
          <div key={g.id} className={styles.skillGroup}>
            <div className={styles.skillGroupHead}>Group</div>
            <h3 className={styles.skillGroupName}>{g.name || "Skills"}</h3>
            {g.description && (
              <p className={styles.skillGroupDesc}>{g.description}</p>
            )}
            <div className={styles.skillChipRow}>
              {g.skills.map((s) => (
                <span key={s} className={styles.pill}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className={styles.skillChipRow}>
          {data.skills.map((s) => (
            <span key={s} className={styles.pill}>
              {s}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

/* ═══ CAREER (experience + education merged) ════════════════════════ */

export function CareerApp({ data }: { data: LayoutData }) {
  if (data.experience.length === 0 && data.education.length === 0) return null;
  return (
    <>
      <div className={styles.appKicker}>
        <span className={styles.accent}>▲</span> Career.app
      </div>
      <h2 className={styles.appTitle}>
        Where I&apos;ve <span className={styles.italic}>been</span>
      </h2>

      {data.experience.length > 0 && (
        <div className={styles.careerSection}>
          <div className={styles.careerSectionHead}>Experience</div>
          <div className={styles.careerTimeline}>
            {data.experience.map((e) => (
              <div key={e.id} className={styles.careerItem}>
                {e.dates && (
                  <div className={styles.careerItemDates}>{e.dates}</div>
                )}
                {e.role && (
                  <h4 className={styles.careerItemRole}>{e.role}</h4>
                )}
                {e.company && (
                  <div className={styles.careerItemCompany}>{e.company}</div>
                )}
                {e.summary && (
                  <p className={styles.careerItemSummary}>{e.summary}</p>
                )}
                {e.skills && e.skills.length > 0 && (
                  <div className={styles.careerItemSkills}>
                    {e.skills.map((s) => (
                      <span key={s} className={styles.pill}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.education.length > 0 && (
        <div className={styles.careerSection}>
          <div className={styles.careerSectionHead}>Education</div>
          <div className={styles.careerTimeline}>
            {data.education.map((e) => (
              <div key={e.id} className={styles.careerItem}>
                {e.dates && (
                  <div className={styles.careerItemDates}>{e.dates}</div>
                )}
                <h4 className={styles.careerItemRole}>{e.institution}</h4>
                {e.degree && (
                  <div className={styles.careerItemCompany}>{e.degree}</div>
                )}
                {e.description && (
                  <p className={styles.careerItemSummary}>{e.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ═══ WRITING (Dev.to) ═══════════════════════════════════════════════ */

export function WritingApp({ data }: { data: LayoutData }) {
  const d = data.devto?.data;
  if (!d || !d.articles?.length) return null;
  return (
    <>
      <div className={styles.appKicker}>
        <span className={styles.accent}>✎</span> Writing.app ·{" "}
        <a
          href={`https://dev.to/${d.username}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          @{d.username} ↗
        </a>
      </div>
      <h2 className={styles.appTitle}>
        Articles &amp; <span className={styles.italic}>essays</span>
      </h2>
      <div className={styles.rowList}>
        {d.articles.map((a) => (
          <a
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.rowItem}
          >
            <div>
              <div className={styles.rowItemTitle}>{a.title}</div>
              <div className={styles.rowItemMeta}>
                {a.publishedAt &&
                  new Date(a.publishedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                {a.readingTimeMinutes ? ` · ${a.readingTimeMinutes} min` : ""}
              </div>
              {/* Tags as pills — parity gap before: Terminal and Brutalist
               * showed them, Press + Bento did not. Cap at 4 tags to keep
               * row heights consistent. */}
              {a.tags && a.tags.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 8,
                  }}
                >
                  {a.tags.slice(0, 4).map((t) => (
                    <span key={t} className={styles.pill}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {a.reactionsCount > 0 && (
              <div className={styles.rowItemAside}>♥ {a.reactionsCount}</div>
            )}
          </a>
        ))}
      </div>
    </>
  );
}

/* ═══ ML (Hugging Face) ══════════════════════════════════════════════ */

export function MLApp({ data }: { data: LayoutData }) {
  const hf = data.huggingface?.data;
  if (!hf || !hf.items?.length) return null;
  return (
    <>
      <div className={styles.appKicker}>
        <span className={styles.accent}>🤗</span> ML.app ·{" "}
        <a
          href={`https://huggingface.co/${hf.username}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          @{hf.username} ↗
        </a>
      </div>
      <h2 className={styles.appTitle}>
        Models, datasets &amp; <span className={styles.italic}>spaces</span>
      </h2>

      <div className={styles.statRow} style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>
        <div className={styles.statCell}>
          <span className={styles.statCellNum}>{hf.totalModels ?? "—"}</span>
          <span className={styles.statCellLabel}>Models</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statCellNum}>{hf.totalDatasets ?? "—"}</span>
          <span className={styles.statCellLabel}>Datasets</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statCellNum}>{hf.totalSpaces ?? "—"}</span>
          <span className={styles.statCellLabel}>Spaces</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statCellNum}>{hf.items.length}</span>
          <span className={styles.statCellLabel}>Shown</span>
        </div>
      </div>

      <div className={styles.rowList} style={{ marginTop: 24 }}>
        {hf.items.map((it) => (
          <a
            key={`${it.kind}-${it.id}`}
            href={it.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.rowItem}
          >
            <div>
              <div className={styles.rowItemTitle}>{it.name}</div>
              <div className={styles.rowItemMeta}>
                {it.kind.toUpperCase()}
                {it.pipelineTag ? ` · ${it.pipelineTag}` : ""}
              </div>
            </div>
            {it.likes > 0 && (
              <div className={styles.rowItemAside}>
                ♥ {it.likes.toLocaleString("en-US")}
              </div>
            )}
          </a>
        ))}
      </div>
    </>
  );
}

/* ═══ LINKS (custom external links) ══════════════════════════════════ */

export function LinksApp({ data }: { data: LayoutData }) {
  if (data.customLinks.length === 0) return null;
  return (
    <>
      <div className={styles.appKicker}>
        <span className={styles.accent}>↗</span> Links.app
      </div>
      <h2 className={styles.appTitle}>
        Find me <span className={styles.italic}>elsewhere</span>
      </h2>
      <div className={styles.rowList}>
        {data.customLinks.map((l) => {
          let host = l.url;
          try {
            host = new URL(l.url).host.replace(/^www\./, "");
          } catch {
            /* not a full URL — show raw value */
          }
          return (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.rowItem}
            >
              <div>
                <div className={styles.rowItemTitle}>{l.label}</div>
                {l.description && (
                  <div
                    className={styles.rowItemMeta}
                    style={{ textTransform: "none", letterSpacing: 0 }}
                  >
                    {l.description}
                  </div>
                )}
              </div>
              <div className={styles.rowItemAside}>{host} ↗</div>
            </a>
          );
        })}
      </div>
    </>
  );
}

/* ═══ FILES (documents) ═══════════════════════════════════════════════ */

export function FilesApp({ data }: { data: LayoutData }) {
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
    <>
      <div className={styles.appKicker}>
        <span className={styles.accent}>📄</span> Files.app
      </div>
      <h2 className={styles.appTitle}>
        <span className={styles.italic}>Documents</span>
      </h2>
      {items.map((f) => (
        <FileBlock key={f.id} {...f} />
      ))}
    </>
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
  const url = cloudinaryUrl(publicId, resourceType);
  const isPdf =
    resourceType === "raw" && format.toLowerCase() === "pdf";
  const isImage = resourceType === "image";
  const isVideo = resourceType === "video";
  return (
    <div className={styles.fileBlock}>
      <div className={styles.fileBlockHead}>
        <span className={styles.fileBlockKind}>{format || "file"}</span>
        <span className={styles.fileBlockName}>{label}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.fileBlockOpen}
        >
          Open ↗
        </a>
      </div>
      {description && <div className={styles.fileBlockDesc}>{description}</div>}
      {isPdf && (
        <object
          data={url}
          type="application/pdf"
          className={styles.fileBlockPdf}
          aria-label={label}
        >
          <p style={{ padding: 16, color: "var(--fg-2)", fontSize: 13 }}>
            Your browser can&apos;t preview this PDF.{" "}
            <a href={url} target="_blank" rel="noopener noreferrer">
              Open it in a new tab
            </a>
            .
          </p>
        </object>
      )}
      {isImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cloudinaryUrl(publicId, "image", "w_1600,f_auto,q_auto")}
          alt={label}
          className={styles.fileBlockImage}
        />
      )}
      {isVideo && (
        <video
          src={url}
          controls
          className={styles.fileBlockPdf}
          preload="metadata"
        />
      )}
    </div>
  );
}