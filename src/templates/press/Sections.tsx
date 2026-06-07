"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
 * ProjectCardModal — clickable preview that opens a portal modal with the
 * full project detail (description, role, all images, all links).
 *
 * Why modal instead of inline expand:
 *   - Inline expand pushed siblings down which caused awkward reflow
 *     mid-page on a long-form editorial layout. Modals keep the project
 *     grid stable while the user inspects one project.
 *   - A single modal at a time mirrors how news/editorial sites handle
 *     "deep dive" content (Vox, NYT magazine, etc.).
 *
 * Modal contract:
 *   - Renders via createPortal to document.body so it escapes any
 *     containing transform/overflow/z-index stacking context
 *   - Click backdrop, press ESC, or click the close button to dismiss
 *   - Body scroll locked while open
 *   - Cleans up listeners + scroll lock on unmount
 *
 * Card preview matches the old collapsed state: image + numeral + title +
 * 3-line lede + year/first-3-tech + a "Read more" affordance.
 */
function ExpandableProjectCard({
  project,
  numeral,
}: {
  project: LayoutData["projects"][number];
  numeral: string;
}) {
  const [open, setOpen] = useState(false);
  const hero = project.images?.[0];

  return (
    <>
      <article className={styles.projectCard}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={styles.projectCardButton}
          aria-label={`Open ${project.title}`}
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
              <p className={styles.projectCardLede}>{project.description}</p>
            )}
            {(project.year || (project.tech && project.tech.length > 0)) && (
              <div className={styles.projectCardMeta}>
                {project.year && <span>{project.year}</span>}
                {project.tech && project.tech.length > 0 && (
                  <span>{project.tech.slice(0, 3).join(", ")}</span>
                )}
              </div>
            )}
            <span className={styles.projectCardToggle} aria-hidden="true">
              Read more →
            </span>
          </div>
        </button>
      </article>
      {open && (
        <ProjectModal project={project} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

/*
 * ProjectModal — full-screen overlay with the project detail. Editorial
 * design: cream background, oxblood serif title, mono-uppercase labels,
 * close button top-right. Uses createPortal so it renders at the document
 * root and escapes any clipping context.
 *
 * Body scroll lock: while open we set overflow:hidden on documentElement
 * AND body to cover all browsers — iOS Safari requires both. Cleanup
 * restores the previous values rather than blanking them, in case some
 * other component had set scroll values for its own reasons.
 */
function ProjectModal({
  project,
  onClose,
}: {
  project: LayoutData["projects"][number];
  onClose: () => void;
}) {
  // SSR guard — createPortal needs document.body which doesn't exist on
  // the server. We render nothing on the server pass; the modal only
  // appears post-hydration when the user clicks "Read more".
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Body scroll lock
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  if (!mounted) return null;

  const hero = project.images?.[0];
  const galleryImages = project.images?.slice(hero ? 1 : 0) ?? [];

  return createPortal(
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
      onClick={(e) => {
        // Only close when the backdrop itself is clicked, not bubbled
        // events from inside the modal content.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modalShell}>
        <button
          type="button"
          onClick={onClose}
          className={styles.modalClose}
          aria-label="Close"
        >
          ✕
        </button>
        <div className={styles.modalContent}>
          {hero && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={deriveUrl(hero.publicId, {
                width: 1800,
                height: 900,
                crop: "fill",
              })}
              alt={hero.caption || project.title}
              className={styles.modalHero}
            />
          )}
          <div className={styles.kicker} style={{ marginTop: hero ? 24 : 0 }}>
            <span className={styles.kickerNum}>Project</span>
            {project.year && <span>{project.year}</span>}
            {project.role && <span>{project.role}</span>}
          </div>
          <h2 className={styles.modalTitle}>{project.title}</h2>
          {project.description && (
            <div className={styles.modalBody}>
              {project.description.split(/\n{2,}/).map((para, i) => (
                <p key={i} className={styles.modalPara}>
                  {para}
                </p>
              ))}
            </div>
          )}

          {project.tech && project.tech.length > 0 && (
            <div className={styles.modalSection}>
              <div className={styles.modalSectionLabel}>Stack</div>
              <div className={styles.modalTech}>
                {project.tech.map((t) => (
                  <span key={t} className={styles.modalTechChip}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(project.demoUrl || project.sourceUrl || project.videoUrl) && (
            <div className={styles.modalSection}>
              <div className={styles.modalSectionLabel}>Links</div>
              <div className={styles.modalLinks}>
                {project.demoUrl && (
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.modalLink}
                  >
                    Live demo ↗
                  </a>
                )}
                {project.sourceUrl && (
                  <a
                    href={project.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.modalLink}
                  >
                    Source ↗
                  </a>
                )}
                {project.videoUrl && (
                  <a
                    href={project.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.modalLink}
                  >
                    Video ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {galleryImages.length > 0 && (
            <div className={styles.modalSection}>
              <div className={styles.modalSectionLabel}>Gallery</div>
              <FeaturedGallery
                images={galleryImages.map((img) => ({
                  id: img.id,
                  publicId: img.publicId,
                  caption: img.caption,
                }))}
                projectTitle={project.title}
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
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
      {/* Top repos — was a parity gap; the integration returns them
       * ranked by stars. Press treatment: bordered list with serif name +
       * italic description, mono-uppercase meta line for language/stars.
       * Limited to 6 to keep the spread balanced. */}
      {g.topRepos && g.topRepos.length > 0 && (
        <div className={styles.topReposList}>
          <div className={styles.topReposLabel}>Top repositories</div>
          {g.topRepos.slice(0, 6).map((repo) => (
            <a
              key={repo.fullName}
              href={repo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.topRepoRow}
            >
              <div className={styles.topRepoNameRow}>
                <span className={styles.topRepoName}>{repo.name}</span>
                <span className={styles.topRepoMeta}>
                  {repo.language && (
                    <span>{repo.language}</span>
                  )}
                  <span>★ {repo.stars.toLocaleString("en-US")}</span>
                </span>
              </div>
              {repo.description && (
                <div className={styles.topRepoDesc}>{repo.description}</div>
              )}
            </a>
          ))}
        </div>
      )}
      {/* Language breakdown — was a parity gap. Terminal + Brutalist + Bento
       * all show this. Press treatment: small caps label, then a row of
       * chips with the language name and a count of how many of the user's
       * non-fork repos use it as primary. */}
      {g.languageBreakdown && g.languageBreakdown.length > 0 && (
        <div className={styles.langStrip}>
          <div className={styles.topReposLabel}>Languages</div>
          <div className={styles.langChipRow}>
            {g.languageBreakdown.slice(0, 10).map((lang) => (
              <span key={lang.language} className={styles.langChipPress}>
                {lang.language}
                <span className={styles.langChipCount}>
                  {" "}
                  ×{lang.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeetCodeBlock({ data }: { data: LayoutData }) {
  const l = data.leetcode?.data;
  if (!l) return null;
  const TOTALS = { easy: 875, medium: 1900, hard: 860 };
  // Compute max streak from the submission heatmap. Terminal does this
  // already; we mirror so the surfaces line up.
  const maxStreak = computeMaxStreak(l.submissionHeatmap ?? []);
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
        {/* Real name — parity with Terminal which shows `name`. Editorial
         * subtitle treatment, italic serif so it reads like an article
         * byline. */}
        {l.realName && (
          <div className={styles.platformByline}>{l.realName}</div>
        )}
      </div>
      <div className={styles.statTiles}>
        <Tile value={l.totalSolved.toLocaleString("en-US")} label="Solved" />
        <Tile
          value={l.ranking !== null ? l.ranking.toLocaleString("en-US") : "—"}
          label="Global rank"
        />
        <Tile value={String(l.currentStreak ?? 0)} label="Current streak" />
        <Tile value={String(maxStreak)} label="Max streak" />
        {/* Country and Active days — surfaced previously only by Terminal
         * and Brutalist; the press tile grid expands to four rows of two
         * tiles each, so we keep adding without crowding. */}
        <Tile value={l.country ?? "—"} label="Country" />
        <Tile
          value={String(l.totalActiveDays ?? 0)}
          label="Active days"
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
      {/* Contest rating chart — was a parity gap; we had only a "latest
       * rating" number tile. Brutalist + Terminal both render a real
       * chart. Reuse the existing RatingChart component (the one used by
       * Codeforces) so visual style stays consistent. */}
      {l.contestHistory && l.contestHistory.length >= 2 && (
        <RatingChart
          points={l.contestHistory.map((p) => ({
            t: p.timestamp * 1000,
            v: p.rating,
          }))}
        />
      )}
    </div>
  );
}

/* Compute the longest run of consecutive days with submissions. Used by
 * LeetCode + Codeforces blocks. Matches Terminal's identical algorithm. */
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
        {/* Country, organization, computed max streak and active days —
         * surfaced by Brutalist + Terminal previously; Press was missing
         * them. The tile grid wraps onto extra rows automatically. */}
        {c.user.country && (
          <Tile value={c.user.country} label="Country" />
        )}
        {c.user.organization && (
          <Tile value={c.user.organization} label="Organization" />
        )}
        {c.submissionHeatmap && c.submissionHeatmap.length > 0 && (
          <>
            <Tile
              value={String(computeMaxStreak(c.submissionHeatmap))}
              label="Max streak"
            />
            <Tile
              value={String(
                c.submissionHeatmap.filter((d) => d.count > 0).length,
              )}
              label="Active days"
            />
          </>
        )}
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
    // Tags joined into the meta line — parity gap before: Terminal +
    // Brutalist showed tags, Press + Bento did not. Cap at 3 tags so the
    // line doesn't overflow.
    meta: [
      a.readingTimeMinutes ? `${a.readingTimeMinutes} min read` : null,
      a.reactionsCount > 0 ? `♥ ${a.reactionsCount}` : null,
      a.tags && a.tags.length > 0 ? a.tags.slice(0, 3).join(" · ") : null,
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
  const hf = data.huggingface.data;
  const rows: WireRow[] = hf.items.slice(0, 12).map((it) => ({
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

  // HF account totals — parity gap (Bento + Terminal surfaced these,
  // Press + Brutalist did not). Join into a small subtitle below the
  // kicker so the section feels grounded in the user's full HF presence.
  const totals = [
    hf.totalModels !== undefined ? `${hf.totalModels} models` : null,
    hf.totalDatasets !== undefined ? `${hf.totalDatasets} datasets` : null,
    hf.totalSpaces !== undefined ? `${hf.totalSpaces} spaces` : null,
  ]
    .filter(Boolean)
    .join(" · ");

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
        {totals && (
          <div className={styles.hfTotals}>
            @{hf.username} · {totals}
          </div>
        )}
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
  // Summary stats above the calendar — Terminal + Brutalist + Bento all
  // surface these; Press was missing the line.
  const totalCount = filtered.reduce((s, d) => s + d.count, 0);
  const activeDays = filtered.filter((d) => d.count > 0).length;
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
      <div className={styles.heatmapSummary}>
        {totalCount.toLocaleString("en-US")} total · {activeDays} active days
      </div>
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