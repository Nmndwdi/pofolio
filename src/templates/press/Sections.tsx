"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import type { LayoutData } from "@/components/layouts/types";
import { deriveUrl } from "@/lib/cloudinary-url";
import styles from "./press.module.css";

/*
 * Press v3 spread content renderers. Each spread (LeadStory, FeaturedWork,
 * TheIndex, CareerNotes, MoreWork, ByTheNumbers, Competitive, TheWire,
 * Documents) is exported as a standalone component. Press.tsx composes them
 * into the page.
 *
 * Each renderer is responsible ONLY for the content WITHIN a spread — the
 * spread wrapper (.spread margin), kicker, and head/title come from
 * Press.tsx so the layout is consistent and editable in one place.
 *
 * Data conventions:
 *   - skillGroups is preferred over flat skills (auto-migration in page.tsx
 *     means a "Skills" group always exists if any skills are present)
 *   - per-experience skills + education descriptions are new fields,
 *     rendered in CareerNotes spread (not the compact Index)
 *   - customLinks descriptions appear under each link in TheWire
 *   - file descriptions appear in Documents
 *   - customSocials get appended to the contributor line in the Colophon
 */

/* ─── Spread 2 — Lead Story ──────────────────────────────────── */

export function LeadStorySpread({ data }: { data: LayoutData }) {
  if (!data.bio) return null;
  // Split bio on double-newlines into paragraphs. Drop cap goes on the first.
  const paragraphs = data.bio
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className={styles.leadStory}>
      <div className={styles.kicker}>
        <span className={styles.kickerNum}>№ I</span>
        <span>The lead story</span>
      </div>
      <h2 className={styles.leadTitle}>In their own words</h2>
      <div className={styles.leadBody}>
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}

/* ─── Spread 3 — Featured Work ───────────────────────────────── */

export function FeaturedWorkSpread({
  project,
}: {
  project: LayoutData["projects"][number];
}) {
  const hero = project.images?.[0];
  // Additional images for the gallery (everything past the hero, OR all
  // images when there's no clear hero). Hero is full-bleed; gallery is
  // contained in the page container.
  const galleryImages = project.images?.slice(hero ? 1 : 0) ?? [];
  return (
    <div className={styles.featured}>
      <div className={styles.featuredKicker}>
        <div className={styles.kicker}>
          <span className={styles.kickerNum}>№ II</span>
          <span>Featured work</span>
        </div>
      </div>
      {hero && (
        <div className={styles.featuredBleed}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={deriveUrl(hero.publicId, {
              width: 2400,
              height: 1350,
              crop: "fill",
            })}
            alt={hero.caption || project.title}
            className={styles.featuredImage}
            loading="lazy"
          />
        </div>
      )}
      <div className={styles.featuredCaptionWrap}>
        <div className={styles.featuredCaption}>
          <h3 className={styles.featuredTitle}>{project.title}</h3>
          {project.description && (
            <p className={styles.featuredLede}>{project.description}</p>
          )}
          {(project.role ||
            project.year ||
            (project.tech && project.tech.length > 0) ||
            project.demoUrl ||
            project.sourceUrl ||
            project.videoUrl) && (
            <div className={styles.featuredMeta}>
              {project.role && (
                <span>
                  <span className={styles.featuredMetaLabel}>Role</span>
                  {project.role}
                </span>
              )}
              {project.year && (
                <span>
                  <span className={styles.featuredMetaLabel}>Year</span>
                  {project.year}
                </span>
              )}
              {project.tech && project.tech.length > 0 && (
                <span>
                  <span className={styles.featuredMetaLabel}>Stack</span>
                  {project.tech.join(", ")}
                </span>
              )}
              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.featuredMetaLink}
                >
                  Demo ↗
                </a>
              )}
              {project.sourceUrl && (
                <a
                  href={project.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.featuredMetaLink}
                >
                  Source ↗
                </a>
              )}
              {project.videoUrl && (
                <a
                  href={project.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.featuredMetaLink}
                >
                  Watch ↗
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Additional images carousel — sits inside the page container (not
          full-bleed). Horizontal scroll with snap-points; arrow buttons
          on desktop call scrollBy(). On mobile the user just swipes. */}
      {galleryImages.length > 0 && (
        <FeaturedGallery
          images={galleryImages.map((img) => ({
            id: img.id,
            publicId: img.publicId,
            caption: img.caption,
          }))}
          projectTitle={project.title}
        />
      )}
    </div>
  );
}

/*
 * FeaturedGallery — horizontal-scrolling image carousel for the additional
 * images of the featured project.
 *
 * Implementation notes:
 *   - Pure CSS scroll-snap. No carousel library — we want a magazine-page
 *     feel, not a slideshow with autoplay and dots.
 *   - Arrow buttons (desktop) trigger scrollBy() with the visible track
 *     width as the step. Hidden on touch devices via `@media (hover: none)`
 *     in the CSS since touch users swipe directly.
 *   - Captions render below each image as italic serif at small size.
 */
function FeaturedGallery({
  images,
  projectTitle,
}: {
  images: Array<{ id: string; publicId: string; caption?: string }>;
  projectTitle: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    // Each "page" is the visible width minus a sliver so users see the next
    // slide peeking — softer than a hard page-snap.
    const step = el.clientWidth * 0.85;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };
  return (
    <div className={styles.featuredGallery}>
      <div className={styles.featuredGalleryHeadRow}>
        <span className={styles.featuredGalleryLabel}>Gallery</span>
        <div className={styles.featuredGalleryControls}>
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className={styles.featuredGalleryBtn}
            aria-label="Previous image"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className={styles.featuredGalleryBtn}
            aria-label="Next image"
          >
            →
          </button>
        </div>
      </div>
      <div ref={trackRef} className={styles.featuredGalleryTrack}>
        {images.map((img, i) => (
          <figure key={img.id} className={styles.featuredGallerySlide}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={deriveUrl(img.publicId, {
                width: 1600,
                height: 1000,
                crop: "fill",
              })}
              alt={img.caption || `${projectTitle} — image ${i + 2}`}
              className={styles.featuredGalleryImage}
              loading="lazy"
            />
            {img.caption && (
              <figcaption className={styles.featuredGalleryCaption}>
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}

/* ─── Spread 4 — The Index (3-col scannable) ─────────────────── */

export function IndexSpread({ data }: { data: LayoutData }) {
  const hasWork = data.experience.length > 0;
  const hasEdu = data.education.length > 0;
  // Prefer skillGroups over flat skills. Page loader auto-migrates flat
  // skills to a "Skills" group, so we always render groups if any skills
  // exist anywhere.
  const hasSkills = data.skillGroups.length > 0;
  if (!hasWork && !hasEdu && !hasSkills) return null;

  return (
    <div className={styles.index}>
      <div className={styles.indexHead}>
        <div className={styles.kicker}>
          <span className={styles.kickerNum}>№ III</span>
          <span>The index</span>
        </div>
        <h2 className={styles.indexTitle}>At a glance</h2>
      </div>
      <div className={styles.indexGrid}>
        {hasWork && (
          <div className={styles.indexColumn}>
            <h3 className={styles.indexColumnTitle}>A working life</h3>
            {data.experience.slice(0, 5).map((e) => (
              <div key={e.id} className={styles.indexEntry}>
                <div className={styles.indexEntryDate}>{e.dates || "—"}</div>
                <div className={styles.indexEntryTitle}>{e.role}</div>
                {e.company && (
                  <div className={styles.indexEntryOrg}>{e.company}</div>
                )}
              </div>
            ))}
          </div>
        )}
        {hasEdu && (
          <div className={styles.indexColumn}>
            <h3 className={styles.indexColumnTitle}>Schooling</h3>
            {data.education.slice(0, 5).map((e) => (
              <div key={e.id} className={styles.indexEntry}>
                <div className={styles.indexEntryDate}>{e.dates || "—"}</div>
                <div className={styles.indexEntryTitle}>{e.institution}</div>
                {e.degree && (
                  <div className={styles.indexEntryOrg}>{e.degree}</div>
                )}
              </div>
            ))}
          </div>
        )}
        {hasSkills && (
          <div className={styles.indexColumn}>
            <h3 className={styles.indexColumnTitle}>Tools</h3>
            {data.skillGroups.map((g) => (
              <div key={g.id} className={styles.indexSkillGroup}>
                {g.name && data.skillGroups.length > 1 && (
                  <div className={styles.indexSkillGroupName}>{g.name}</div>
                )}
                <div className={styles.indexSkillsFlow}>
                  {g.skills.map((s, i) => (
                    <Fragment key={i}>
                      {i > 0 && <span className={styles.sep}>·</span>}
                      <span>{s}</span>
                    </Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Spread 5 — Career Notes (conditional, 2-col) ───────────── */

/**
 * Renders ONLY if at least one experience has a substantial summary
 * (>120 chars) OR at least one education has a description. The
 * compact Index spread covers the bare facts; this is the long-form
 * version for users who've written real descriptions.
 */
export function CareerNotesSpread({ data }: { data: LayoutData }) {
  const richExperience = data.experience.filter(
    (e) => e.summary && e.summary.length > 120,
  );
  const richEducation = data.education.filter(
    (e) => e.description && e.description.length > 0,
  );
  if (richExperience.length === 0 && richEducation.length === 0) return null;

  // Pulled quote: pick the first long-enough summary's most quotable line.
  const pulledQuote = (() => {
    const source = richExperience[0]?.summary ?? richEducation[0]?.description;
    if (!source) return null;
    // Pick the longest sentence (usually the most assertive line). Cap at
    // 180 chars to keep the visual weight balanced.
    const sentences = source.split(/(?<=[.!?])\s+/).filter((s) => s.length > 30);
    const longest = sentences.sort((a, b) => b.length - a.length)[0];
    if (!longest) return null;
    return longest.length > 180 ? longest.slice(0, 177) + "…" : longest;
  })();
  const quoteAttrib = richExperience[0]
    ? `${richExperience[0].role} · ${richExperience[0].company}`
    : richEducation[0]
      ? richEducation[0].institution
      : null;

  return (
    <div className={styles.careerNotes}>
      <div className={styles.careerHead}>
        <div className={styles.kicker}>
          <span className={styles.kickerNum}>№ IV</span>
          <span>Career notes</span>
        </div>
        <h2 className={styles.indexTitle}>The long version</h2>
      </div>
      <div className={styles.careerGrid}>
        <div>
          {richExperience.map((e) => (
            <article key={e.id} className={styles.careerEntry}>
              <div className={styles.careerEntryDateline}>
                {e.dates} · {e.company}
              </div>
              <h3 className={styles.careerEntryTitle}>{e.role}</h3>
              {e.summary && <p className={styles.careerEntryBody}>{e.summary}</p>}
              {e.skills && e.skills.length > 0 && (
                <div className={styles.careerEntrySkills}>
                  {e.skills.map((s, i) => (
                    <Fragment key={i}>
                      {i > 0 && <span className={styles.skillSep}>·</span>}
                      <span>{s}</span>
                    </Fragment>
                  ))}
                </div>
              )}
            </article>
          ))}
          {richEducation.map((e) => (
            <article key={e.id} className={styles.careerEntry}>
              <div className={styles.careerEntryDateline}>
                {e.dates} · {e.institution}
              </div>
              <h3 className={styles.careerEntryTitle}>{e.degree}</h3>
              {e.description && (
                <p className={styles.careerEntryBody}>{e.description}</p>
              )}
            </article>
          ))}
        </div>
        <div>
          {pulledQuote && (
            <blockquote className={styles.pulledQuote}>
              &ldquo;{pulledQuote}&rdquo;
              {quoteAttrib && (
                <div className={styles.pulledQuoteAttrib}>— {quoteAttrib}</div>
              )}
            </blockquote>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Spread 6 — More Work (project grid) ────────────────────── */

export function MoreWorkSpread({
  projects,
  startIndex,
}: {
  projects: LayoutData["projects"];
  startIndex: number;
}) {
  if (projects.length === 0) return null;
  const ROMAN = [
    "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
    "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
  ];
  return (
    <div className={styles.moreWork}>
      <div className={styles.moreWorkHead}>
        <div className={styles.kicker}>
          <span className={styles.kickerNum}>№ V</span>
          <span>More work</span>
        </div>
        <h2 className={styles.indexTitle}>Other projects</h2>
      </div>
      <div className={styles.projectGrid}>
        {projects.map((p, i) => (
          <ExpandableProjectCard
            key={p.id}
            project={p}
            numeral={ROMAN[startIndex + i - 1] ?? String(startIndex + i)}
          />
        ))}
      </div>
    </div>
  );
}

/*
 * ExpandableProjectCard — clickable card that expands inline to show all
 * project detail (full description, tech list, all images carousel, all
 * links). Collapsed state = the compact card from before (image + title +
 * 3-line lede + year/first-3-tech). Expanded state = the same Featured Work
 * detail treatment, just contained in the page container.
 *
 * Why inline expand instead of modal/drawer:
 *   - Modals interrupt the reading flow; expansion keeps the reader anchored
 *   - Modals require focus traps + escape handling + body scroll lock; an
 *     inline expand has none of that complexity
 *   - Multiple projects can be expanded at once if the user wants to compare
 *
 * Animation: max-height + opacity transition on the expanded panel. We use
 * a generous max-height (3000px) since project descriptions can be long;
 * the transition still feels smooth because we're animating the visual
 * change, not the actual height computation.
 */
function ExpandableProjectCard({
  project,
  numeral,
}: {
  project: LayoutData["projects"][number];
  numeral: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hero = project.images?.[0];
  const galleryImages = project.images?.slice(1) ?? [];

  return (
    <article
      className={`${styles.projectCard} ${expanded ? styles.projectCardExpanded : ""}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={styles.projectCardButton}
        aria-expanded={expanded}
      >
        <div className={styles.projectCardImageWrap}>
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={deriveUrl(hero.publicId, {
                width: 800,
                height: 600,
                crop: "fill",
              })}
              alt={hero.caption || project.title}
              className={styles.projectCardImage}
              loading="lazy"
            />
          ) : (
            <div className={styles.projectCardImage} />
          )}
        </div>
        <div className={styles.projectCardBody}>
          <div className={styles.projectCardNum}>№ {numeral}</div>
          <h3 className={styles.projectCardTitle}>{project.title}</h3>
          {project.description && (
            <p
              className={
                expanded
                  ? styles.projectCardLedeFull
                  : styles.projectCardLede
              }
            >
              {project.description}
            </p>
          )}
          {(project.year || (project.tech && project.tech.length > 0)) && (
            <div className={styles.projectCardMeta}>
              {project.year && <span>{project.year}</span>}
              {project.tech && project.tech.length > 0 && (
                <span>
                  {expanded
                    ? project.tech.join(", ")
                    : project.tech.slice(0, 3).join(", ")}
                </span>
              )}
            </div>
          )}
          <span className={styles.projectCardToggle} aria-hidden="true">
            {expanded ? "− Less" : "+ More"}
          </span>
        </div>
      </button>

      {/* Expanded detail panel — only animated visible on expansion. Sits
          below the clickable card area. All metadata, links, and the image
          gallery (if any extras exist). */}
      <div
        className={styles.projectCardDetail}
        // aria-hidden when collapsed so screen readers skip it; visible
        // when expanded.
        aria-hidden={!expanded}
      >
        {(project.role ||
          project.demoUrl ||
          project.sourceUrl ||
          project.videoUrl) && (
          <div className={styles.projectCardDetailMeta}>
            {project.role && (
              <span>
                <span className={styles.projectCardDetailLabel}>Role</span>
                {project.role}
              </span>
            )}
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.projectCardDetailLink}
                onClick={(e) => e.stopPropagation()}
              >
                Demo ↗
              </a>
            )}
            {project.sourceUrl && (
              <a
                href={project.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.projectCardDetailLink}
                onClick={(e) => e.stopPropagation()}
              >
                Source ↗
              </a>
            )}
            {project.videoUrl && (
              <a
                href={project.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.projectCardDetailLink}
                onClick={(e) => e.stopPropagation()}
              >
                Watch ↗
              </a>
            )}
          </div>
        )}

        {galleryImages.length > 0 && (
          <FeaturedGallery
            images={galleryImages.map((img) => ({
              id: img.id,
              publicId: img.publicId,
              caption: img.caption,
            }))}
            projectTitle={project.title}
          />
        )}
      </div>
    </article>
  );
}

/* ─── Spread 7 — By the Numbers ──────────────────────────────── */

export function ByNumbersSpread({ data }: { data: LayoutData }) {
  const g = data.github?.data;
  const l = data.leetcode?.data;
  if (!g && !l) return null;
  return (
    <div className={styles.byNumbers}>
      <div className={styles.byNumbersHead}>
        <div className={styles.kicker}>
          <span className={styles.kickerNum}>№ VI</span>
          <span>By the numbers</span>
        </div>
        <h2 className={styles.indexTitle}>Code &amp; problem-solving</h2>
      </div>
      <div className={styles.byNumbersGrid}>
        {g && <GitHubBlock data={data} />}
        {l && <LeetCodeBlock data={data} />}
      </div>
    </div>
  );
}

function GitHubBlock({ data }: { data: LayoutData }) {
  const g = data.github?.data;
  if (!g) return null;
  return (
    <div className={styles.platformBlock}>
      <div className={styles.platformHead}>
        <div className={styles.platformName}>GitHub</div>
        <a
          href={`https://github.com/${g.user.login}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.platformHandle}
        >
          @{g.user.login} ↗
        </a>
      </div>
      <div className={styles.statTiles}>
        <Tile
          value={g.user.publicRepos.toLocaleString("en-US")}
          label="Repositories"
        />
        <Tile
          value={g.totalStars.toLocaleString("en-US")}
          label="Stars"
        />
        <Tile
          value={
            g.contributions
              ? g.contributions.total.toLocaleString("en-US")
              : "—"
          }
          label="Contribs (year)"
        />
        <Tile
          value={g.user.followers.toLocaleString("en-US")}
          label="Followers"
        />
      </div>
      {g.contributions && g.contributions.days.length > 0 && (
        <Heatmap days={g.contributions.days} label="Contribution activity" />
      )}
    </div>
  );
}

function LeetCodeBlock({ data }: { data: LayoutData }) {
  const l = data.leetcode?.data;
  if (!l) return null;
  const TOTALS = { easy: 875, medium: 1900, hard: 860 };
  return (
    <div className={styles.platformBlock}>
      <div className={styles.platformHead}>
        <div className={styles.platformName}>LeetCode</div>
        <a
          href={`https://leetcode.com/u/${l.username}/`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.platformHandle}
        >
          @{l.username} ↗
        </a>
      </div>
      <div className={styles.statTiles}>
        <Tile value={l.totalSolved.toLocaleString("en-US")} label="Solved" />
        <Tile
          value={l.ranking !== null ? l.ranking.toLocaleString("en-US") : "—"}
          label="Global rank"
        />
        <Tile value={String(l.currentStreak ?? 0)} label="Current streak" />
        <Tile
          value={
            l.contestHistory && l.contestHistory.length > 0
              ? String(l.contestHistory[l.contestHistory.length - 1].rating)
              : "—"
          }
          label="Contest rating"
        />
      </div>
      <div className={styles.ratioStrip}>
        <RatioBar label="Easy" value={l.easySolved} max={TOTALS.easy} />
        <RatioBar label="Medium" value={l.mediumSolved} max={TOTALS.medium} />
        <RatioBar label="Hard" value={l.hardSolved} max={TOTALS.hard} />
      </div>
      {l.submissionHeatmap && l.submissionHeatmap.length > 0 && (
        <Heatmap days={l.submissionHeatmap} label="Submission activity" />
      )}
    </div>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.statTile}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function RatioBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={styles.ratioRow}>
      <span className={styles.ratioLabel}>{label}</span>
      <div className={styles.ratioBar}>
        <div className={styles.ratioFill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.ratioValue}>
        {value} <span style={{ color: "var(--press-muted)" }}>/ {max}</span>
      </span>
    </div>
  );
}

/* ─── Spread 8 — Competitive (Codeforces, full width) ────────── */

export function CompetitiveSpread({ data }: { data: LayoutData }) {
  const c = data.codeforces?.data;
  if (!c) return null;
  const ratingPoints = (c.ratingHistory ?? []).map((r) => ({
    t: r.timestamp * 1000,
    v: r.rating,
  }));
  return (
    <div className={styles.competitive}>
      <div className={styles.competitiveHead}>
        <div>
          <div className={styles.kicker}>
            <span className={styles.kickerNum}>№ VII</span>
            <span>Competitive</span>
          </div>
          <h2 className={styles.competitiveTitle}>
            Codeforces ·{" "}
            <span style={{ fontStyle: "italic", color: "var(--press-oxblood)" }}>
              @{c.user.handle}
            </span>
          </h2>
        </div>
        <a
          href={`https://codeforces.com/profile/${c.user.handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.platformHandle}
        >
          Profile ↗
        </a>
      </div>
      <div className={styles.competitiveStats}>
        <Tile
          value={c.user.rating !== null ? String(c.user.rating) : "—"}
          label="Current rating"
        />
        <Tile
          value={c.user.maxRating !== null ? String(c.user.maxRating) : "—"}
          label="Max rating"
        />
        <Tile value={c.user.rank ?? "—"} label="Rank" />
        <Tile
          value={String(c.contestsParticipated)}
          label="Contests"
        />
      </div>
      {ratingPoints.length >= 2 && (
        <RatingChart points={ratingPoints} />
      )}
      {/* Submission heatmap — shows when the user was active. Same calendar
          logic as GitHub/LeetCode heatmaps. Wrapped in a margin block so it
          breathes between the chart above and the contests list below. */}
      {c.submissionHeatmap && c.submissionHeatmap.length > 0 && (
        <div style={{ margin: "32px 0" }}>
          <Heatmap
            days={c.submissionHeatmap}
            label="Submission activity"
          />
        </div>
      )}
      {c.recentContests && c.recentContests.length > 0 && (
        <div className={styles.recentContests}>
          {c.recentContests.slice(0, 5).map((r) => {
            const delta = r.newRating - r.oldRating;
            return (
              <a
                key={r.contestId}
                href={`https://codeforces.com/contest/${r.contestId}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contestRow}
              >
                <span className={styles.contestDate}>
                  {new Date(r.timestamp * 1000).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className={styles.contestName}>{r.contestName}</span>
                <span className={styles.contestMeta}>
                  rank {r.rank.toLocaleString("en-US")} ·{" "}
                  <span
                    className={
                      delta >= 0
                        ? styles.contestDeltaPos
                        : styles.contestDeltaNeg
                    }
                  >
                    {delta >= 0 ? "+" : ""}
                    {delta}
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RatingChart({ points }: { points: Array<{ t: number; v: number }> }) {
  const sorted = [...points].sort((a, b) => a.t - b.t);
  const W = 800;
  const H = 240;
  const padX = 40;
  const padTop = 24;
  const padBot = 36;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBot;
  const ts = sorted.map((p) => p.t);
  const vs = sorted.map((p) => p.v);
  const tMin = Math.min(...ts);
  const tMax = Math.max(...ts);
  const vMin = Math.min(...vs);
  const vMax = Math.max(...vs);
  const tSpan = tMax - tMin || 1;
  const vSpan = vMax - vMin || 1;
  const xy = sorted.map((p) => {
    const x = padX + ((p.t - tMin) / tSpan) * innerW;
    const y = padTop + (1 - (p.v - vMin) / vSpan) * innerH;
    return [x, y] as const;
  });
  const linePath = xy
    .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(" ");
  const areaPath = `${linePath} L${xy[xy.length - 1][0]},${H - padBot} L${xy[0][0]},${H - padBot} Z`;
  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      <line
        x1={padX}
        x2={W - padX}
        y1={H - padBot}
        y2={H - padBot}
        className={styles.chartAxis}
      />
      <path d={areaPath} className={styles.chartArea} />
      <path d={linePath} className={styles.chartLine} />
      <text x={padX} y={padTop - 6} className={styles.chartLabel}>
        {Math.round(vMax)}
      </text>
      <text x={padX} y={H - padBot + 16} className={styles.chartLabel}>
        {Math.round(vMin)}
      </text>
    </svg>
  );
}

/* ─── Spreads 9-11 — Writing / Machine Learning / Elsewhere ────
 * Split out from the old "The Wire" consolidated spread. Each lives as its
 * own chapter — articles, ML works, and external links are conceptually
 * different and benefit from being distinct sections rather than mixed
 * into one feed. */

interface WireRow {
  key: string;
  source: string;
  date?: string;
  title: string;
  url: string;
  meta?: string;
  description?: string;
}

export function WritingSpread({
  data,
  num,
}: {
  data: LayoutData;
  num: string;
}) {
  if (!data.devto?.data || data.devto.data.articles.length === 0) return null;
  const rows: WireRow[] = data.devto.data.articles.slice(0, 12).map((a) => ({
    key: `devto-${a.id}`,
    source: "Dev.to",
    date: new Date(a.publishedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    title: a.title,
    url: a.url,
    meta: [
      a.readingTimeMinutes ? `${a.readingTimeMinutes} min read` : null,
      a.reactionsCount > 0 ? `♥ ${a.reactionsCount}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  }));

  return (
    <div className={styles.wire}>
      <div className={styles.wireHead}>
        <div className={styles.kicker}>
          <span className={styles.kickerNum}>№ {num}</span>
          <span>Writing</span>
        </div>
        <h2 className={styles.indexTitle}>
          Recent articles &amp; essays
        </h2>
      </div>
      <WireList rows={rows} />
    </div>
  );
}

export function MachineLearningSpread({
  data,
  num,
}: {
  data: LayoutData;
  num: string;
}) {
  if (!data.huggingface?.data || data.huggingface.data.items.length === 0)
    return null;
  const rows: WireRow[] = data.huggingface.data.items
    .slice(0, 12)
    .map((it) => ({
      key: `hf-${it.kind}-${it.id}`,
      // Kind serves as the source kicker: MODEL / DATASET / SPACE.
      source: it.kind.toUpperCase(),
      title: it.name,
      url: it.url,
      meta: [
        it.pipelineTag,
        it.likes > 0 ? `♥ ${it.likes.toLocaleString("en-US")}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }));

  return (
    <div className={styles.wire}>
      <div className={styles.wireHead}>
        <div className={styles.kicker}>
          <span className={styles.kickerNum}>№ {num}</span>
          <span>Machine learning</span>
        </div>
        <h2 className={styles.indexTitle}>
          Models, datasets &amp; spaces
        </h2>
      </div>
      <WireList rows={rows} />
    </div>
  );
}

export function ElsewhereSpread({
  data,
  num,
}: {
  data: LayoutData;
  num: string;
}) {
  if (data.customLinks.length === 0) return null;
  const rows: WireRow[] = data.customLinks.map((l) => ({
    key: `link-${l.id}`,
    source: (() => {
      try {
        return new URL(l.url).host.replace(/^www\./, "").toUpperCase();
      } catch {
        return "LINK";
      }
    })(),
    title: l.label,
    url: l.url,
    description: l.description,
  }));

  return (
    <div className={styles.wire}>
      <div className={styles.wireHead}>
        <div className={styles.kicker}>
          <span className={styles.kickerNum}>№ {num}</span>
          <span>Elsewhere</span>
        </div>
        <h2 className={styles.indexTitle}>External links &amp; projects</h2>
      </div>
      <WireList rows={rows} />
    </div>
  );
}

/*
 * WireList — shared list renderer for Writing / ML / Elsewhere. Same row
 * treatment in all three: source kicker · date / title / meta. Descriptions
 * render below as a full-width second row.
 */
function WireList({ rows }: { rows: WireRow[] }) {
  return (
    <div className={styles.wireList}>
      {rows.map((it) => (
        <a
          key={it.key}
          href={it.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.wireRow}
        >
          <span className={styles.wireSource}>
            {it.source}
            {it.date && ` · ${it.date}`}
          </span>
          <h4 className={styles.wireTitle}>{it.title}</h4>
          <span className={styles.wireMeta}>{it.meta ?? ""}</span>
          {it.description && (
            <p className={styles.wireDescription}>{it.description}</p>
          )}
        </a>
      ))}
    </div>
  );
}

/* ─── Spread 10 — Documents ──────────────────────────────────── */

export function DocumentsSpread({ data }: { data: LayoutData }) {
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
    <div className={styles.documents}>
      <div className={styles.documentsHead}>
        <div className={styles.kicker}>
          <span className={styles.kickerNum}>№ IX</span>
          <span>Documents</span>
        </div>
        <h2 className={styles.indexTitle}>For the record</h2>
      </div>
      <div className={styles.documentList}>
        {items.map((f) => (
          <FileBlock key={f.id} {...f} />
        ))}
      </div>
    </div>
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
  const isPdf = resourceType === "raw" && format.toLowerCase() === "pdf";
  const isImage = resourceType === "image";
  const isVideo = resourceType === "video";
  return (
    <div className={styles.fileBlock}>
      <div className={styles.fileHead}>
        <span className={styles.fileKind}>{format || "file"}</span>
        <span className={styles.fileName}>{label}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.fileOpen}
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
              Open it in a new tab
            </a>
            .
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
    </div>
  );
}

/* ─── Contributor line (socials before colophon) ─────────────── */

export function ContributorLine({ data }: { data: LayoutData }) {
  // Build the typeset contributor line. Includes the fixed socials (when set)
  // plus all customSocials.
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
  // CustomSocials appended after the fixed ones — same visual treatment.
  for (const s of data.customSocials) {
    entries.push({ label: s.label, href: s.url });
  }
  if (entries.length === 0) return null;
  return (
    <div className={styles.contributorLine}>
      <span className={styles.contributorLead}>
        Find {data.displayName} on
      </span>
      {entries.map((e, i) => (
        <Fragment key={`${e.label}-${i}`}>
          {i > 0 && <span className={styles.contributorSep}>·</span>}
          <a
            href={e.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.contributorLink}
          >
            {e.label}
          </a>
        </Fragment>
      ))}
    </div>
  );
}

/* ─── Heatmap (shared between GH/LC) ─────────────────────────── */

function Heatmap({
  days,
  label,
}: {
  days: Array<{ date: string; count: number }>;
  label: string;
}) {
  const availableYears = useMemo(() => {
    return Array.from(
      new Set(days.map((d) => new Date(d.date).getFullYear())),
    ).sort((a, b) => b - a);
  }, [days]);
  const [selectedYear, setSelectedYear] = useState<number>(
    availableYears[0] ?? new Date().getFullYear(),
  );
  const filtered = useMemo(
    () => days.filter((d) => new Date(d.date).getFullYear() === selectedYear),
    [days, selectedYear],
  );
  if (filtered.length === 0) {
    return (
      <div className={styles.heatmap}>
        <div className={styles.heatmapLabel}>{label}</div>
        <div className={styles.heatmapLabel}>
          No activity for {selectedYear}.
        </div>
      </div>
    );
  }
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
  const windowStart = new Date(selectedYear, 0, 1);
  const windowEnd = new Date(selectedYear, 11, 31);
  const renderStart = new Date(windowStart);
  renderStart.setDate(renderStart.getDate() - renderStart.getDay());
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays =
    Math.floor((windowEnd.getTime() - renderStart.getTime()) / msPerDay) + 1;
  const totalWeeks = Math.ceil(totalDays / 7);
  const byDate = new Map(filtered.map((d) => [d.date, d.count]));
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
      grid[d][w] = levelFor(byDate.get(`${y}-${m}-${dd}`) ?? 0);
    }
  }
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
        monthLabel[w] = firstRealDate.toLocaleString("en-US", {
          month: "short",
        });
        lastLabelWeek = w;
      }
      prevMonth = m;
    }
  }
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <div className={styles.heatmap}>
      <div className={styles.heatmapLabel}>{label}</div>
      {availableYears.length > 1 && (
        <div className={styles.heatmapYears}>
          {availableYears.map((y) => (
            <button
              key={y}
              type="button"
              className={styles.heatmapYearBtn}
              data-active={y === selectedYear}
              onClick={() => setSelectedYear(y)}
            >
              {y}
            </button>
          ))}
        </div>
      )}
      <div
        className={styles.heatmapCalendar}
        style={{
          gridTemplateColumns: `1.5em repeat(${totalWeeks}, minmax(6px, 1fr))`,
        }}
      >
        <span />
        {monthLabel.map((m, i) => (
          <span key={`m-${i}`} className={styles.heatmapMonth}>
            {m || "\u00A0"}
          </span>
        ))}
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